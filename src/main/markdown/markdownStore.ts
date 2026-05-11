import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { ArtifactGraph, CreateMarkdownPageInput, UnifiedSearchResult, WikiPageBundle, WikiPageNode } from '../../shared/types.js';
import { extractWikilinks } from '../wiki/wikiBridge.js';
import { extractArtifactLinks } from '../vault/vaultStore.js';

const PAGES_DIR = 'pages';

export async function createMarkdownPage(root: string, input: CreateMarkdownPageInput): Promise<WikiPageBundle> {
  const title = sanitizeTitle(input.title);
  const pagesDir = path.join(root, PAGES_DIR);
  await mkdir(pagesDir, { recursive: true });
  const relativePath = await uniquePagePath(root, slugify(title));
  const markdown = input.markdown ?? `# ${title}\n\n`;
  const content = hasFrontmatter(markdown) ? markdown : `---\ntitle: ${JSON.stringify(title)}\ntags: [${normalizeTags(input.tags ?? []).join(', ')}]\n---\n${markdown.startsWith('#') ? markdown : `# ${title}\n\n${markdown}`}`;
  await writeFile(path.join(root, relativePath), content);
  return readMarkdownPageFromVault(root, `wiki:${relativePath}`);
}

export async function listMarkdownPages(root: string): Promise<WikiPageNode[]> {
  const pagesDir = path.join(root, PAGES_DIR);
  if (!existsSync(pagesDir)) return [];
  const files = await listMarkdownFiles(root, pagesDir);
  const pages = await Promise.all(files.map((file) => readPageNode(root, file)));
  return pages.sort((a, b) => a.title.localeCompare(b.title));
}

export async function readMarkdownPageFromVault(root: string, pageId: string): Promise<WikiPageBundle> {
  const filePath = resolveVaultMarkdownPath(root, pageId);
  const [node, markdown] = await Promise.all([readPageNode(root, filePath), readFile(filePath, 'utf8')]);
  return { node, markdown };
}

export async function updateMarkdownPage(root: string, pageId: string, markdown: string): Promise<WikiPageBundle> {
  const filePath = resolveVaultMarkdownPath(root, pageId);
  await writeFile(filePath, markdown);
  return readMarkdownPageFromVault(root, pageId);
}

export async function createMarkdownSnapshot(root: string, pageId: string, markdown: string, reason = 'manual'): Promise<{ kind: 'markdown-before-apply'; pageId: string; relativePath: string; snapshotPath: string; createdAt: string; markdown: string }> {
  const filePath = resolveVaultMarkdownPath(root, pageId);
  const relativePath = toVaultRelativePath(root, filePath);
  const createdAt = new Date().toISOString();
  const safeReason = reason.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'snapshot';
  const snapshotRelativePath = path.join('.snapshots', relativePath.replace(/\.md$/i, ''), `${createdAt.replace(/[:.]/g, '-')}-${safeReason}.md`).split(path.sep).join('/');
  const snapshotPath = path.join(root, snapshotRelativePath);
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, markdown);
  return { kind: 'markdown-before-apply', pageId, relativePath, snapshotPath: snapshotRelativePath, createdAt, markdown };
}

export interface MarkdownSnapshotSummary { pageId: string; relativePath: string; snapshotPath: string; createdAt: string; sizeBytes: number }

export async function listMarkdownSnapshots(root: string, pageId: string): Promise<MarkdownSnapshotSummary[]> {
  const filePath = resolveVaultMarkdownPath(root, pageId);
  const relativePath = toVaultRelativePath(root, filePath);
  const snapshotDir = path.join(root, '.snapshots', relativePath.replace(/\.md$/i, ''));
  if (!existsSync(snapshotDir)) return [];
  const entries = await readdir(snapshotDir, { withFileTypes: true });
  const snapshots = await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md')).map(async (entry) => {
    const snapshotPath = path.join(snapshotDir, entry.name);
    const info = await stat(snapshotPath);
    const snapshotRelativePath = toVaultRelativePath(root, snapshotPath);
    const createdAt = parseSnapshotCreatedAt(entry.name) ?? info.mtime.toISOString();
    return { pageId, relativePath, snapshotPath: snapshotRelativePath, createdAt, sizeBytes: info.size };
  }));
  return snapshots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readMarkdownSnapshot(root: string, pageId: string, snapshotPath: string): Promise<MarkdownSnapshotSummary & { markdown: string }> {
  const snapshots = await listMarkdownSnapshots(root, pageId);
  const snapshot = snapshots.find((item) => item.snapshotPath === snapshotPath);
  if (!snapshot) throw new Error('Markdown snapshot not found for page');
  const absolutePath = path.resolve(root, snapshot.snapshotPath);
  const snapshotRoot = path.resolve(root, '.snapshots');
  if (!absolutePath.startsWith(`${snapshotRoot}${path.sep}`)) throw new Error('Markdown snapshot path escapes snapshots directory');
  return { ...snapshot, markdown: await readFile(absolutePath, 'utf8') };
}

export async function restoreMarkdownSnapshot(root: string, pageId: string, snapshotPath: string): Promise<{ page: WikiPageBundle; restoredSnapshot: MarkdownSnapshotSummary & { markdown: string }; safetySnapshot: Awaited<ReturnType<typeof createMarkdownSnapshot>> }> {
  const current = await readMarkdownPageFromVault(root, pageId);
  const restoredSnapshot = await readMarkdownSnapshot(root, pageId, snapshotPath);
  const safetySnapshot = await createMarkdownSnapshot(root, pageId, current.markdown, 'pre-snapshot-restore');
  const page = await updateMarkdownPage(root, pageId, restoredSnapshot.markdown);
  return { page, restoredSnapshot, safetySnapshot };
}

export async function searchMarkdownPagesInVault(root: string, query: string): Promise<UnifiedSearchResult[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const pages = await listMarkdownPages(root);
  const results: UnifiedSearchResult[] = [];
  for (const page of pages) {
    if (!normalizedQuery) {
      results.push(toSearchResult(page, 'all markdown pages'));
      continue;
    }
    const markdown = await readFile(page.path, 'utf8');
    const haystacks = [
      { label: 'title', value: page.title },
      { label: 'tags', value: page.tags.join(' ') },
      { label: 'path', value: page.relativePath },
      { label: 'markdown', value: markdown }
    ];
    const match = haystacks.find((item) => item.value.toLowerCase().includes(normalizedQuery));
    if (match) results.push(toSearchResult(page, match.label));
  }
  return results.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getMarkdownGraph(root: string): Promise<ArtifactGraph> {
  const pages = await listMarkdownPages(root);
  const resolver = buildResolver(pages);
  const edges = pages.flatMap((page) => {
    const wikiEdges = page.wikilinks.flatMap((link) => {
      const target = resolver.get(normalizeWikiTarget(link.target));
      return target ? [{ from: page.id, to: target.id, kind: 'wikilink' as const }] : [];
    });
    const artifactEdges = page.artifactLinks.map((artifactId) => ({ from: page.id, to: artifactId, kind: 'artifact-link' as const }));
    return [...wikiEdges, ...artifactEdges];
  });
  return { nodes: pages, edges };
}

async function readPageNode(root: string, filePath: string): Promise<WikiPageNode> {
  const markdown = await readFile(filePath, 'utf8');
  const relativePath = toVaultRelativePath(root, filePath);
  const frontmatter = parseFrontmatter(markdown);
  const title = typeof frontmatter.title === 'string' && frontmatter.title.trim() ? frontmatter.title : markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || path.basename(filePath, '.md');
  return {
    id: `wiki:${relativePath}`,
    kind: 'wiki',
    title,
    tags: parseTags(frontmatter.tags),
    path: filePath,
    relativePath,
    sourceOwnership: 'vault-owned',
    wikilinks: extractWikilinks(markdown),
    artifactLinks: extractArtifactLinks(markdown)
  };
}

async function listMarkdownFiles(root: string, directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listMarkdownFiles(root, entryPath));
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) files.push(entryPath);
  }
  return files.sort((a, b) => toVaultRelativePath(root, a).localeCompare(toVaultRelativePath(root, b)));
}

async function uniquePagePath(root: string, baseSlug: string) {
  let candidate = path.join(PAGES_DIR, `${baseSlug}.md`).split(path.sep).join('/');
  let suffix = 2;
  while (existsSync(path.join(root, candidate))) {
    candidate = path.join(PAGES_DIR, `${baseSlug}-${suffix}.md`).split(path.sep).join('/');
    suffix += 1;
  }
  return candidate;
}

function resolveVaultMarkdownPath(root: string, pageId: string) {
  if (!pageId.startsWith('wiki:')) throw new Error('Invalid Markdown page id');
  const relativePath = pageId.slice('wiki:'.length);
  if (!relativePath.startsWith(`${PAGES_DIR}/`) || !relativePath.toLowerCase().endsWith('.md')) throw new Error('Only vault-owned Markdown pages can be edited here');
  const filePath = path.resolve(root, relativePath);
  const pagesRoot = path.resolve(root, PAGES_DIR);
  if (!filePath.startsWith(`${pagesRoot}${path.sep}`)) throw new Error('Markdown page path escapes pages directory');
  return filePath;
}

function toSearchResult(page: WikiPageNode, matchReason: string): UnifiedSearchResult {
  return {
    id: page.id,
    kind: 'wiki',
    title: page.title,
    tags: page.tags,
    project: page.tags.includes('project') ? page.title : undefined,
    matchReason,
    sourceOwnership: page.sourceOwnership,
    relativePath: page.relativePath
  };
}

function buildResolver(pages: WikiPageNode[]) {
  const byKey = new Map<string, WikiPageNode>();
  for (const page of pages) {
    byKey.set(normalizeWikiTarget(page.relativePath.replace(/\.md$/i, '')), page);
    byKey.set(normalizeWikiTarget(path.basename(page.relativePath, '.md')), page);
    byKey.set(normalizeWikiTarget(page.title), page);
  }
  return byKey;
}

function normalizeWikiTarget(value: string) {
  return value.replace(/\.md$/i, '').trim().toLowerCase().replace(/\\/g, '/');
}

function parseSnapshotCreatedAt(fileName: string): string | null {
  const match = fileName.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
  if (!match) return null;
  return match[1].replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z');
}

function parseFrontmatter(markdown: string): Record<string, unknown> {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const result: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) continue;
    const [, key, rawValue] = keyValue;
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      result[key] = rawValue.slice(1, -1).split(',').map((item) => item.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      result[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
  return result;
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[\s,]+/).map((tag) => tag.trim()).filter(Boolean);
  return [];
}

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].sort();
}

function hasFrontmatter(markdown: string) {
  return /^---\n[\s\S]*?\n---\n/.test(markdown);
}

function sanitizeTitle(title: string) {
  return title.replace(/\s+/g, ' ').trim().slice(0, 120) || 'Untitled page';
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'page';
}

function toVaultRelativePath(root: string, filePath: string) {
  return path.relative(root, filePath).split(path.sep).join('/');
}
