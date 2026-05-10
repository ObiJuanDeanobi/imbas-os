import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ArtifactMetadata, SyncChange, SyncLogicalType, SyncManifest, SyncManifestEntry, SyncNode, SyncStatus, TrustLevel } from '../../shared/types.js';

const VAULT_DIR = '.vault';
const NODE_JSON = 'node.json';
const SYNC_MANIFEST_JSON = 'sync-manifest.json';

export function syncNodePath(root: string) {
  return path.join(root, VAULT_DIR, NODE_JSON);
}

export function syncManifestPath(root: string) {
  return path.join(root, VAULT_DIR, SYNC_MANIFEST_JSON);
}

export async function getOrCreateSyncNode(root: string, displayName = os.hostname()): Promise<SyncNode> {
  await mkdir(path.join(root, VAULT_DIR), { recursive: true });
  const nodePath = syncNodePath(root);
  if (existsSync(nodePath)) return JSON.parse(await readFile(nodePath, 'utf8')) as SyncNode;
  const now = new Date().toISOString();
  const node: SyncNode = { id: randomUUID(), displayName: displayName.trim() || os.hostname(), createdAt: now };
  await writeFile(nodePath, `${JSON.stringify(node, null, 2)}\n`);
  return node;
}

export async function rebuildSyncManifest(root: string, nodeId?: string): Promise<SyncManifest> {
  const node = nodeId ? { id: nodeId } : await getOrCreateSyncNode(root);
  const previous = await readExistingManifest(root);
  const entries = await buildManifestEntries(root, node.id, previous);
  const manifest: SyncManifest = {
    version: 1,
    rootId: previous?.rootId ?? createHash('sha256').update(path.resolve(root)).digest('hex').slice(0, 24),
    generatedAt: new Date().toISOString(),
    nodeId: node.id,
    entries
  };
  await mkdir(path.join(root, VAULT_DIR), { recursive: true });
  await writeFile(syncManifestPath(root), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function getSyncStatus(root: string, nodeId?: string): Promise<SyncStatus> {
  const localNode = nodeId ? { ...(await getOrCreateSyncNode(root)), id: nodeId } : await getOrCreateSyncNode(root);
  const previous = await readExistingManifest(root);
  const currentEntries = await buildManifestEntries(root, localNode.id, previous, false);
  const previousByPath = new Map((previous?.entries ?? []).map((entry) => [entry.path, entry]));
  const currentByPath = new Map(currentEntries.map((entry) => [entry.path, entry]));
  const changedFiles: SyncChange[] = [];
  const conflictCandidates: SyncChange[] = [];

  for (const current of currentEntries) {
    const old = previousByPath.get(current.path);
    if (!old) {
      changedFiles.push({ ...current, reason: 'new-file' });
      continue;
    }
    if (old.hash === current.hash && old.trustLevel === current.trustLevel) continue;
    const reason = old.trustLevel !== current.trustLevel && current.logicalType === 'artifact-metadata'
      ? 'trust-level-change-requires-review'
      : 'changed-file';
    const change: SyncChange = { ...current, previousHash: old.hash, reason };
    changedFiles.push(change);
    if (old.lastWriterNode !== localNode.id) {
      conflictCandidates.push({ ...change, reason: reason === 'trust-level-change-requires-review' ? reason : 'remote-writer-diverged' });
    }
  }

  for (const old of previousByPath.values()) {
    if (currentByPath.has(old.path)) continue;
    const deleted: SyncChange = { ...old, previousHash: old.hash, reason: 'deleted-file' };
    changedFiles.push(deleted);
    if (old.lastWriterNode !== localNode.id) conflictCandidates.push({ ...deleted, reason: 'remote-writer-diverged' });
  }

  changedFiles.sort((a, b) => a.path.localeCompare(b.path));
  conflictCandidates.sort((a, b) => a.path.localeCompare(b.path));
  return {
    localNode,
    manifestPath: syncManifestPath(root),
    manifestGeneratedAt: previous?.generatedAt,
    trackedFiles: currentEntries.length,
    changedFiles,
    conflictCandidates
  };
}

async function buildManifestEntries(root: string, currentNodeId: string, previous?: SyncManifest | null, preservePreviousWriters = true): Promise<SyncManifestEntry[]> {
  const previousByPath = new Map((previous?.entries ?? []).map((entry) => [entry.path, entry]));
  const files = await listSyncableFiles(root);
  const entries = await Promise.all(files.map(async (filePath) => {
    const relativePath = toVaultRelativePath(root, filePath);
    const raw = await readFile(filePath);
    const fileStat = await stat(filePath);
    const logicalType = inferLogicalType(relativePath);
    const previousEntry = previousByPath.get(relativePath);
    const hash = createHash('sha256').update(raw).digest('hex');
    const trustLevel = logicalType === 'artifact-metadata' ? parseTrustLevel(raw.toString('utf8')) : undefined;
    const unchanged = previousEntry?.hash === hash && previousEntry?.trustLevel === trustLevel;
    return {
      path: relativePath,
      hash,
      bytes: raw.byteLength,
      logicalType,
      updatedAt: fileStat.mtime.toISOString(),
      lastWriterNode: preservePreviousWriters && unchanged ? previousEntry.lastWriterNode : currentNodeId,
      ...(trustLevel ? { trustLevel } : {})
    } satisfies SyncManifestEntry;
  }));
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

async function listSyncableFiles(root: string, directory = root): Promise<string[]> {
  if (!existsSync(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    const relative = toVaultRelativePath(root, entryPath);
    if (shouldSkip(relative, entry.isDirectory())) continue;
    if (entry.isDirectory()) files.push(...await listSyncableFiles(root, entryPath));
    if (entry.isFile()) files.push(entryPath);
  }
  return files.sort((a, b) => toVaultRelativePath(root, a).localeCompare(toVaultRelativePath(root, b)));
}

function shouldSkip(relativePath: string, isDirectory: boolean) {
  if (relativePath === VAULT_DIR) return false;
  if (relativePath === `${VAULT_DIR}/index.sqlite`) return true;
  if (relativePath === `${VAULT_DIR}/${NODE_JSON}`) return true;
  if (relativePath === `${VAULT_DIR}/${SYNC_MANIFEST_JSON}`) return true;
  if (relativePath.startsWith(`${VAULT_DIR}/`) && relativePath !== `${VAULT_DIR}/manifest.json`) return true;
  if (isDirectory && (relativePath.endsWith('/node_modules') || relativePath.includes('/node_modules/'))) return true;
  return false;
}

function inferLogicalType(relativePath: string): SyncLogicalType {
  if (relativePath === `${VAULT_DIR}/manifest.json`) return 'vault-manifest';
  if (relativePath.endsWith('.md') && !relativePath.includes('/snapshots/')) return relativePath.endsWith('/notes.md') ? 'artifact-notes' : 'markdown-page';
  if (/^artifacts\/[^/]+\/artifact\.html$/i.test(relativePath)) return 'artifact-html';
  if (/^artifacts\/[^/]+\/metadata\.json$/i.test(relativePath)) return 'artifact-metadata';
  if (/^artifacts\/[^/]+\/snapshots\/.*\.html$/i.test(relativePath)) return 'artifact-snapshot-html';
  if (/^artifacts\/[^/]+\/snapshots\/.*\.json$/i.test(relativePath)) return 'artifact-snapshot-metadata';
  return 'unknown';
}

function parseTrustLevel(json: string): TrustLevel | undefined {
  try {
    const parsed = JSON.parse(json) as Partial<ArtifactMetadata>;
    return parsed.trustLevel && ['untrusted', 'reviewed', 'trusted'].includes(parsed.trustLevel) ? parsed.trustLevel : undefined;
  } catch {
    return undefined;
  }
}

async function readExistingManifest(root: string): Promise<SyncManifest | null> {
  const manifestPath = syncManifestPath(root);
  if (!existsSync(manifestPath)) return null;
  return JSON.parse(await readFile(manifestPath, 'utf8')) as SyncManifest;
}

function toVaultRelativePath(root: string, filePath: string) {
  return path.relative(root, filePath).split(path.sep).join('/');
}
