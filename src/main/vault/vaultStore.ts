import { createHash, randomUUID } from 'node:crypto';
import { copyFile, cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { ArtifactBundle, ArtifactGraph, ArtifactMetadata, ArtifactSearchResult, ArtifactSnapshot, ArtifactSummary, CreateArtifactInput, UpdateArtifactMetadataInput, VaultInfo } from '../../shared/types.js';

export const ARTIFACT_HTML = 'artifact.html';
export const METADATA_JSON = 'metadata.json';
export const NOTES_MD = 'notes.md';
export const SNAPSHOTS_DIR = 'snapshots';

export function defaultVaultRoot(appDataPath: string) {
  return path.join(appDataPath, 'html-artifact-vault');
}

export async function initVault(root: string): Promise<VaultInfo> {
  const artifactsDir = path.join(root, 'artifacts');
  await mkdir(artifactsDir, { recursive: true });
  await mkdir(path.join(root, '.vault'), { recursive: true });
  const manifestPath = path.join(root, '.vault', 'manifest.json');
  if (!existsSync(manifestPath)) {
    await writeFile(manifestPath, JSON.stringify({ version: 1, createdAt: new Date().toISOString() }, null, 2));
  }
  return { root, artifactsDir, artifactCount: await countArtifacts(artifactsDir) };
}

export async function createArtifact(root: string, input: CreateArtifactInput): Promise<ArtifactBundle> {
  const vault = await initVault(root);
  const id = randomUUID();
  const now = new Date().toISOString();
  const title = sanitizeTitle(input.title || inferTitle(input.html) || 'Untitled artifact');
  const notes = `# ${title}\n\nImported ${now}.\n\n## Notes\n\n`;
  const metadata: ArtifactMetadata = {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    sourceType: input.sourceType ?? 'paste',
    prompt: input.prompt ?? '',
    model: input.model ?? '',
    provider: input.provider ?? '',
    sourcePath: input.sourcePath,
    project: input.project,
    trustLevel: 'untrusted',
    tags: input.tags ?? [],
    hashes: { sha256Html: sha256(input.html) },
    links: extractArtifactLinks(`${input.html}\n${notes}\n${input.prompt ?? ''}`),
    snapshotCount: 1,
    trustAudit: [{ at: now, from: 'untrusted', to: 'untrusted', reason: 'Artifact imported into the vault as untrusted by default.' }]
  };

  const bundlePath = path.join(vault.artifactsDir, id);
  await mkdir(path.join(bundlePath, SNAPSHOTS_DIR), { recursive: true });
  await writeFile(path.join(bundlePath, ARTIFACT_HTML), input.html);
  await writeFile(path.join(bundlePath, METADATA_JSON), JSON.stringify(metadata, null, 2));
  await writeFile(path.join(bundlePath, NOTES_MD), notes);
  await writeFile(path.join(bundlePath, SNAPSHOTS_DIR, `${safeTimestamp(now)}.html`), input.html);
  await writeFile(path.join(bundlePath, SNAPSHOTS_DIR, `${safeTimestamp(now)}.json`), JSON.stringify(metadata, null, 2));

  return { metadata, html: input.html, notes, bundlePath };
}

export async function createArtifactFromFile(root: string, filePath: string): Promise<ArtifactBundle> {
  if (!filePath.toLowerCase().endsWith('.html') && !filePath.toLowerCase().endsWith('.htm')) throw new Error('Only .html and .htm files can be imported');
  const html = await readFile(filePath, 'utf8');
  return createArtifact(root, {
    html,
    title: inferTitle(html) || path.basename(filePath).replace(/\.html?$/i, ''),
    sourceType: 'file',
    sourcePath: filePath,
    project: 'Imports',
    tags: ['imported']
  });
}

export async function importArtifactBundleFromDirectory(root: string, sourceDirectory: string): Promise<ArtifactBundle> {
  const [html, metadataRaw, notes] = await Promise.all([
    readFile(path.join(sourceDirectory, ARTIFACT_HTML), 'utf8'),
    readFile(path.join(sourceDirectory, METADATA_JSON), 'utf8'),
    readFile(path.join(sourceDirectory, NOTES_MD), 'utf8').catch(() => '')
  ]);
  const metadata = JSON.parse(metadataRaw) as Partial<ArtifactMetadata>;
  const created = await createArtifact(root, {
    html,
    title: metadata.title || inferTitle(html) || path.basename(sourceDirectory),
    sourceType: 'file',
    prompt: metadata.prompt,
    model: metadata.model,
    provider: metadata.provider,
    sourcePath: sourceDirectory,
    project: metadata.project,
    tags: metadata.tags ?? ['bundle-import']
  });
  await updateArtifactNotes(root, created.metadata.id, notes || created.notes);
  return updateArtifactMetadata(root, created.metadata.id, {
    title: metadata.title,
    tags: metadata.tags,
    trustLevel: 'untrusted',
    prompt: metadata.prompt,
    model: metadata.model,
    provider: metadata.provider,
    sourcePath: sourceDirectory,
    project: metadata.project
  });
}

export async function exportArtifactBundleToDirectory(root: string, id: string, destinationDirectory: string): Promise<string> {
  const bundle = await readArtifact(root, id);
  const exportName = `${slugify(bundle.metadata.title)}-${bundle.metadata.id.slice(0, 8)}`;
  const target = await uniqueExportPath(destinationDirectory, exportName);
  await mkdir(destinationDirectory, { recursive: true });
  await cp(bundle.bundlePath, target, { recursive: true, force: false, errorOnExist: true });
  return target;
}

export async function listArtifacts(root: string): Promise<ArtifactSummary[]> {
  const vault = await initVault(root);
  const entries = await readdir(vault.artifactsDir, { withFileTypes: true });
  const summaries: ArtifactSummary[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const bundlePath = path.join(vault.artifactsDir, entry.name);
      const metadata = JSON.parse(await readFile(path.join(bundlePath, METADATA_JSON), 'utf8')) as ArtifactMetadata;
      const notes = await readFile(path.join(bundlePath, NOTES_MD), 'utf8').catch(() => '');
      summaries.push({ ...metadata, bundlePath, notePreview: notes.slice(0, 240) });
    } catch {
      // Ignore malformed bundles; index rebuild/reporting can surface these later.
    }
  }
  return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readArtifact(root: string, id: string): Promise<ArtifactBundle> {
  assertSafeId(id);
  const bundlePath = path.join(root, 'artifacts', id);
  const [metadataRaw, html, notes] = await Promise.all([
    readFile(path.join(bundlePath, METADATA_JSON), 'utf8'),
    readFile(path.join(bundlePath, ARTIFACT_HTML), 'utf8'),
    readFile(path.join(bundlePath, NOTES_MD), 'utf8')
  ]);
  return { metadata: JSON.parse(metadataRaw) as ArtifactMetadata, html, notes, bundlePath };
}

export async function updateArtifactNotes(root: string, id: string, notes: string): Promise<ArtifactBundle> {
  assertSafeId(id);
  const bundlePath = path.join(root, 'artifacts', id);
  const metadata = JSON.parse(await readFile(path.join(bundlePath, METADATA_JSON), 'utf8')) as ArtifactMetadata;
  const html = await readFile(path.join(bundlePath, ARTIFACT_HTML), 'utf8');
  const updatedMetadata = { ...metadata, updatedAt: new Date().toISOString(), links: extractArtifactLinks(`${html}\n${notes}\n${metadata.prompt}`) };
  await writeFile(path.join(bundlePath, NOTES_MD), notes);
  await writeFile(path.join(bundlePath, METADATA_JSON), JSON.stringify(updatedMetadata, null, 2));
  return readArtifact(root, id);
}

export async function updateArtifactMetadata(root: string, id: string, input: UpdateArtifactMetadataInput): Promise<ArtifactBundle> {
  assertSafeId(id);
  if (input.trustLevel && !['untrusted', 'reviewed', 'trusted'].includes(input.trustLevel)) throw new Error('Invalid trust level');
  const bundle = await readArtifact(root, id);
  const now = new Date().toISOString();
  const nextTrustLevel = input.trustLevel ?? bundle.metadata.trustLevel;
  const trustAudit = bundle.metadata.trustAudit ?? [];
  if (nextTrustLevel !== bundle.metadata.trustLevel) {
    const reason = input.trustReason?.trim();
    if (!reason) throw new Error('Trust level changes require a review reason');
    trustAudit.push({ at: now, from: bundle.metadata.trustLevel, to: nextTrustLevel, reason: reason.slice(0, 500) });
  }
  const updatedMetadata: ArtifactMetadata = {
    ...bundle.metadata,
    title: input.title === undefined ? bundle.metadata.title : sanitizeTitle(input.title),
    tags: input.tags === undefined ? bundle.metadata.tags : normalizeTags(input.tags),
    trustLevel: nextTrustLevel,
    prompt: input.prompt ?? bundle.metadata.prompt,
    model: input.model ?? bundle.metadata.model,
    provider: input.provider ?? bundle.metadata.provider,
    sourcePath: input.sourcePath ?? bundle.metadata.sourcePath,
    project: input.project ?? bundle.metadata.project,
    updatedAt: now,
    trustAudit
  };
  updatedMetadata.links = extractArtifactLinks(`${bundle.html}\n${bundle.notes}\n${updatedMetadata.prompt}`);
  await writeFile(path.join(bundle.bundlePath, METADATA_JSON), JSON.stringify(updatedMetadata, null, 2));
  return readArtifact(root, id);
}

export async function searchArtifacts(root: string, query: string): Promise<ArtifactSearchResult[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const artifacts = await listArtifacts(root);
  if (!normalizedQuery) return artifacts.map((artifact) => ({ ...artifact, matchReason: 'all artifacts' }));

  const results: ArtifactSearchResult[] = [];
  for (const artifact of artifacts) {
    const bundle = await readArtifact(root, artifact.id);
    const haystacks = [
      { label: 'title', value: artifact.title },
      { label: 'tags', value: artifact.tags.join(' ') },
      { label: 'project', value: artifact.project ?? '' },
      { label: 'notes', value: bundle.notes },
      { label: 'prompt', value: artifact.prompt },
      { label: 'html', value: stripHtml(bundle.html) }
    ];
    const match = haystacks.find((item) => item.value.toLowerCase().includes(normalizedQuery));
    if (match) results.push({ ...artifact, matchReason: match.label });
  }
  return results;
}

export async function getArtifactGraph(root: string): Promise<ArtifactGraph> {
  const artifacts = await listArtifacts(root);
  const ids = new Set(artifacts.map((artifact) => artifact.id));
  return {
    nodes: artifacts.map((artifact) => ({ id: artifact.id, kind: 'artifact', title: artifact.title, tags: artifact.tags, project: artifact.project })),
    edges: artifacts.flatMap((artifact) => artifact.links.filter((to) => ids.has(to)).map((to) => ({ from: artifact.id, to, kind: 'artifact-link' })))
  };
}

export async function createSnapshot(root: string, id: string): Promise<ArtifactMetadata> {
  const bundle = await readArtifact(root, id);
  const now = new Date().toISOString();
  const metadata: ArtifactMetadata = {
    ...bundle.metadata,
    updatedAt: now,
    snapshotCount: bundle.metadata.snapshotCount + 1,
    hashes: { sha256Html: sha256(bundle.html) }
  };
  const snapshotDir = path.join(bundle.bundlePath, SNAPSHOTS_DIR);
  await mkdir(snapshotDir, { recursive: true });
  await writeFile(path.join(snapshotDir, `${safeTimestamp(now)}.html`), bundle.html);
  await writeFile(path.join(snapshotDir, `${safeTimestamp(now)}.json`), JSON.stringify(metadata, null, 2));
  await writeFile(path.join(bundle.bundlePath, METADATA_JSON), JSON.stringify(metadata, null, 2));
  return metadata;
}

export async function listSnapshots(root: string, id: string): Promise<ArtifactSnapshot[]> {
  const bundle = await readArtifact(root, id);
  const snapshotDir = path.join(bundle.bundlePath, SNAPSHOTS_DIR);
  const entries = await readdir(snapshotDir).catch((): string[] => []);
  return entries
    .filter((entry) => entry.endsWith('.html'))
    .map((entry) => entry.slice(0, -'.html'.length))
    .filter((snapshotId) => entries.includes(`${snapshotId}.json`))
    .sort()
    .reverse()
    .map((snapshotId) => ({
      id: snapshotId,
      createdAt: snapshotId.replace(/-(\d{3})Z$/, '.$1Z').replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3'),
      htmlPath: path.join(snapshotDir, `${snapshotId}.html`),
      metadataPath: path.join(snapshotDir, `${snapshotId}.json`)
    }));
}

export async function restoreSnapshot(root: string, id: string, snapshotId: string): Promise<ArtifactBundle> {
  assertSafeId(id);
  assertSafeSnapshotId(snapshotId);
  const bundle = await readArtifact(root, id);
  const snapshotDir = path.join(bundle.bundlePath, SNAPSHOTS_DIR);
  const htmlPath = path.join(snapshotDir, `${snapshotId}.html`);
  const metadataPath = path.join(snapshotDir, `${snapshotId}.json`);
  const [html, snapshotMetadataRaw] = await Promise.all([readFile(htmlPath, 'utf8'), readFile(metadataPath, 'utf8')]);
  const snapshotMetadata = JSON.parse(snapshotMetadataRaw) as ArtifactMetadata;
  const now = new Date().toISOString();
  const restoredMetadata: ArtifactMetadata = {
    ...bundle.metadata,
    title: snapshotMetadata.title,
    prompt: snapshotMetadata.prompt,
    model: snapshotMetadata.model,
    provider: snapshotMetadata.provider,
    sourcePath: snapshotMetadata.sourcePath,
    project: snapshotMetadata.project,
    trustLevel: snapshotMetadata.trustLevel,
    tags: snapshotMetadata.tags,
    hashes: { sha256Html: sha256(html) },
    links: extractArtifactLinks(`${html}\n${bundle.notes}\n${snapshotMetadata.prompt}`),
    updatedAt: now,
    snapshotCount: bundle.metadata.snapshotCount + 1
  };
  await copyFile(htmlPath, path.join(bundle.bundlePath, ARTIFACT_HTML));
  await writeFile(path.join(bundle.bundlePath, METADATA_JSON), JSON.stringify(restoredMetadata, null, 2));
  await writeFile(path.join(snapshotDir, `${safeTimestamp(now)}.html`), html);
  await writeFile(path.join(snapshotDir, `${safeTimestamp(now)}.json`), JSON.stringify(restoredMetadata, null, 2));
  return readArtifact(root, id);
}

export async function exportArtifactMarkdown(root: string, id: string): Promise<string> {
  const bundle = await readArtifact(root, id);
  return `# ${bundle.metadata.title}\n\n` +
    `- Artifact ID: ${bundle.metadata.id}\n` +
    `- Trust level: ${bundle.metadata.trustLevel}\n` +
    `- Trust audit entries: ${bundle.metadata.trustAudit?.length ?? 0}\n` +
    `- Created: ${bundle.metadata.createdAt}\n` +
    `- Updated: ${bundle.metadata.updatedAt}\n` +
    `- SHA-256: ${bundle.metadata.hashes.sha256Html}\n` +
    `- Source path: ${bundle.metadata.sourcePath || 'not recorded'}\n` +
    `- Project: ${bundle.metadata.project || 'not recorded'}\n` +
    `- Tags: ${bundle.metadata.tags.join(', ') || 'none'}\n\n` +
    `## Sidecar note\n\n${bundle.notes.trim()}\n\n` +
    `## Source prompt\n\n${bundle.metadata.prompt || '_No source prompt recorded._'}\n`;
}

export async function exportArtifactJson(root: string, id: string): Promise<string> {
  const bundle = await readArtifact(root, id);
  return JSON.stringify({ metadata: bundle.metadata, notes: bundle.notes, html: bundle.html }, null, 2);
}

export async function exportArtifactPromptPackage(root: string, id: string): Promise<string> {
  const bundle = await readArtifact(root, id);
  const snapshots = await listSnapshots(root, id);
  const links = bundle.metadata.links.length ? bundle.metadata.links.map((link) => `- artifact://${link}`).join('\n') : '- none';
  const snapshotHistory = snapshots.length
    ? snapshots.slice(0, 12).map((snapshot) => `- ${snapshot.createdAt} — ${snapshot.id}`).join('\n')
    : '- none recorded';
  const visibleText = normalizeExtractedText(stripHtml(bundle.html));
  return `# Artifact Context Package: ${bundle.metadata.title}\n\n` +
    `Use this package to continue, critique, revise, or regenerate the artifact while preserving its current purpose, provenance, and local-first safety assumptions.\n\n` +
    `## Artifact\n\n` +
    `- Title: ${bundle.metadata.title}\n` +
    `- Artifact ID: ${bundle.metadata.id}\n` +
    `- Project: ${bundle.metadata.project || 'not recorded'}\n` +
    `- Tags: ${bundle.metadata.tags.join(', ') || 'none'}\n` +
    `- Trust level: ${bundle.metadata.trustLevel}\n` +
    `- Trust audit entries: ${bundle.metadata.trustAudit?.length ?? 0}\n` +
    `- Created: ${bundle.metadata.createdAt}\n` +
    `- Last modified: ${bundle.metadata.updatedAt}\n` +
    `- SHA-256: ${bundle.metadata.hashes.sha256Html}\n\n` +
    `## Provenance\n\n` +
    `- Source type: ${bundle.metadata.sourceType}\n` +
    `- Source path: ${bundle.metadata.sourcePath || 'not recorded'}\n` +
    `- Provider/model: ${[bundle.metadata.provider, bundle.metadata.model].filter(Boolean).join(' / ') || 'not recorded'}\n` +
    `- Bundle path: ${bundle.bundlePath}\n` +
    `- Explicit artifact links:\n${links}\n\n` +
    `## Original prompt\n\n${bundle.metadata.prompt || '_No source prompt recorded._'}\n\n` +
    `## Current notes\n\n${bundle.notes.trim() || '_No sidecar notes recorded._'}\n\n` +
    `## Visible text extracted from HTML\n\n${visibleText || '_No visible text extracted._'}\n\n` +
    `## Trust audit\n\n${formatTrustAudit(bundle.metadata.trustAudit)}\n\n` +
    `## Snapshot history\n\n${snapshotHistory}\n\n` +
    `## HTML artifact\n\n\`\`\`html\n${bundle.html}\n\`\`\`\n\n` +
    `## User request\n\n` +
    `Continue improving this artifact while preserving its current purpose and constraints. Review it for correctness, usefulness, accessibility, and security-sensitive behavior. Do not add network dependencies unless explicitly requested. Return either a revised self-contained HTML artifact or a concise critique with specific changes.\n\n` +
    `## Local-first safety reminder\n\n` +
    `This context package was assembled from a local Imbas Artifact Vault bundle. Treat generated HTML as untrusted unless reviewed. Do not paste secrets into external AI tools.\n`;
}

export function extractArtifactLinks(value: string): string[] {
  const links = new Set<string>();
  const patterns = [
    /\[\[artifact:([a-f0-9-]{36})\]\]/gi,
    /artifact:\/\/([a-f0-9-]{36})\b/gi,
    /data-artifact-link=["']([a-f0-9-]{36})["']/gi
  ];
  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) links.add(match[1]);
  }
  return [...links].sort();
}

async function countArtifacts(artifactsDir: string) {
  if (!existsSync(artifactsDir)) return 0;
  const entries = await readdir(artifactsDir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const metadataPath = path.join(artifactsDir, entry.name, METADATA_JSON);
    if (existsSync(metadataPath) && (await stat(metadataPath)).isFile()) count += 1;
  }
  return count;
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function inferTitle(html: string) {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
}

function sanitizeTitle(title: string) {
  return title.replace(/\s+/g, ' ').trim().slice(0, 120) || 'Untitled artifact';
}

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].sort();
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'artifact';
}

async function uniqueExportPath(destinationDirectory: string, basename: string) {
  let candidate = path.join(destinationDirectory, basename);
  let suffix = 2;
  while (existsSync(candidate)) {
    candidate = path.join(destinationDirectory, `${basename}-${suffix}`);
    suffix += 1;
  }
  return candidate;
}

function stripHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
}

function formatTrustAudit(entries: NonNullable<ArtifactMetadata['trustAudit']> = []) {
  if (!entries.length) return '- none recorded';
  return entries.map((entry) => `- ${entry.at}: ${entry.from} → ${entry.to} — ${entry.reason}`).join('\n');
}

function normalizeExtractedText(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 4000);
}

function safeTimestamp(value: string) {
  return value.replace(/[:.]/g, '-');
}

function assertSafeId(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error('Invalid artifact id');
}

function assertSafeSnapshotId(snapshotId: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(snapshotId)) throw new Error('Invalid snapshot id');
}
