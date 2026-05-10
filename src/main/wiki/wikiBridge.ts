import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { ArtifactGraph, UnifiedSearchResult, WikiBridgeReport, WikiPageBundle, WikiPageNode } from '../../shared/types.js';
import { extractArtifactLinks } from '../vault/vaultStore.js';

export async function indexMarkdownVault(root: string): Promise<ArtifactGraph> {
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) throw new Error('Wiki bridge root must be a directory');
  const files = await listMarkdownFiles(root);
  const pages = await Promise.all(files.map((filePath) => readWikiPage(root, filePath)));
  const byKey = buildResolver(pages);
  const edges = pages.flatMap((page) => {
    const markdownTargets = page.wikilinks.flatMap((link) => {
      const target = byKey.get(normalizeWikiTarget(link.target));
      return target ? [{ from: page.id, to: target.id, kind: 'wikilink' as const }] : [];
    });
    const artifactTargets = page.artifactLinks.map((artifactId) => ({ from: page.id, to: artifactId, kind: 'artifact-link' as const }));
    return [...markdownTargets, ...artifactTargets];
  });
  return { nodes: pages, edges };
}

export function mergeArtifactAndWikiGraphs(artifactGraph: ArtifactGraph, wikiGraph: ArtifactGraph): ArtifactGraph {
  const artifactIds = new Set(artifactGraph.nodes.map((node) => node.id));
  return {
    nodes: [...artifactGraph.nodes, ...wikiGraph.nodes],
    edges: [
      ...artifactGraph.edges,
      ...wikiGraph.edges.filter((edge) => edge.to.startsWith('wiki:') || artifactIds.has(edge.to))
    ]
  };
}

export async function readMarkdownPage(root: string, pageId: string): Promise<WikiPageBundle> {
  if (!pageId.startsWith('wiki:')) throw new Error('Invalid wiki page id');
  const relativePath = pageId.slice('wiki:'.length);
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('\0')) throw new Error('Invalid wiki page path');
  const filePath = path.resolve(root, relativePath);
  const resolvedRoot = path.resolve(root);
  if (!filePath.startsWith(`${resolvedRoot}${path.sep}`) && filePath !== resolvedRoot) throw new Error('Wiki page path escapes bridge root');
  if (!filePath.toLowerCase().endsWith('.md')) throw new Error('Only Markdown pages can be read');
  const node = await readWikiPage(root, filePath);
  return { node, markdown: await readFile(filePath, 'utf8') };
}

export async function searchMarkdownPages(root: string, query: string): Promise<UnifiedSearchResult[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const graph = await indexMarkdownVault(root);
  const pages = graph.nodes.filter((node): node is WikiPageNode => node.kind === 'wiki');
  const results: UnifiedSearchResult[] = [];
  for (const page of pages) {
    if (!normalizedQuery) {
      results.push(toWikiSearchResult(page, 'all markdown pages'));
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
    if (match) results.push(toWikiSearchResult(page, match.label));
  }
  return results.sort((a, b) => a.title.localeCompare(b.title));
}

export async function buildWikiBridgeReport(root: string, artifactGraph: ArtifactGraph): Promise<WikiBridgeReport> {
  const wikiGraph = await indexMarkdownVault(root);
  const pages = wikiGraph.nodes.filter((node): node is WikiPageNode => node.kind === 'wiki');
  const pageIds = new Set(pages.map((page) => page.id));
  const artifactIds = new Set(artifactGraph.nodes.map((node) => node.id));
  const resolvedWikiPairs = new Set(wikiGraph.edges.filter((edge) => edge.kind === 'wikilink').map((edge) => `${edge.from}\u0000${edge.to}`));
  const resolvedArtifactPairs = new Set(wikiGraph.edges.filter((edge) => edge.kind === 'artifact-link' && artifactIds.has(edge.to)).map((edge) => `${edge.from}\u0000${edge.to}`));
  const resolver = buildResolver(pages);

  const unresolvedWikilinks = pages.flatMap((page) => page.wikilinks.flatMap((link) => {
    const target = resolver.get(normalizeWikiTarget(link.target));
    return target && resolvedWikiPairs.has(`${page.id}\u0000${target.id}`) ? [] : [{ from: page.relativePath, target: link.target }];
  }));
  const unresolvedArtifactLinks = pages.flatMap((page) => page.artifactLinks.flatMap((artifactId) => (
    resolvedArtifactPairs.has(`${page.id}\u0000${artifactId}`) ? [] : [{ from: page.relativePath, artifactId }]
  )));
  const connectedPageIds = new Set<string>();
  for (const edge of wikiGraph.edges) {
    if (pageIds.has(edge.from)) connectedPageIds.add(edge.from);
    if (pageIds.has(edge.to)) connectedPageIds.add(edge.to);
  }
  const orphanPages = pages.filter((page) => !connectedPageIds.has(page.id)).map((page) => page.relativePath).sort();
  const wikilinkCount = pages.reduce((count, page) => count + page.wikilinks.length, 0);
  const artifactLinkCount = pages.reduce((count, page) => count + page.artifactLinks.length, 0);
  return {
    root,
    pageCount: pages.length,
    wikilinkCount,
    resolvedWikilinkCount: wikilinkCount - unresolvedWikilinks.length,
    unresolvedWikilinks,
    artifactLinkCount,
    resolvedArtifactLinkCount: artifactLinkCount - unresolvedArtifactLinks.length,
    unresolvedArtifactLinks,
    orphanPageCount: orphanPages.length,
    orphanPages,
    recommendation: unresolvedWikilinks.length || unresolvedArtifactLinks.length ? 'investigate' : 'migration-premature'
  };
}

export function extractWikilinks(markdown: string): { target: string; label?: string; embed: boolean }[] {
  const links: { target: string; label?: string; embed: boolean }[] = [];
  const pattern = /(!)?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
  for (const match of markdown.matchAll(pattern)) {
    const target = match[2]?.trim();
    if (!target || target.toLowerCase().startsWith('artifact:')) continue;
    links.push({ target, label: match[3]?.trim(), embed: Boolean(match[1]) });
  }
  return links;
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await listMarkdownFiles(entryPath));
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) files.push(entryPath);
  }
  return files.sort();
}

async function readWikiPage(root: string, filePath: string): Promise<WikiPageNode> {
  const markdown = await readFile(filePath, 'utf8');
  const relativePath = path.relative(root, filePath).split(path.sep).join('/');
  const frontmatter = parseFrontmatter(markdown);
  const title = typeof frontmatter.title === 'string' && frontmatter.title.trim() ? frontmatter.title : markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || path.basename(filePath, '.md');
  return {
    id: `wiki:${relativePath}`,
    kind: 'wiki',
    title,
    tags: parseTags(frontmatter.tags),
    path: filePath,
    relativePath,
    sourceOwnership: 'external-readonly',
    wikilinks: extractWikilinks(markdown),
    artifactLinks: extractArtifactLinks(markdown)
  };
}

function toWikiSearchResult(page: WikiPageNode, matchReason: string): UnifiedSearchResult {
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

function parseFrontmatter(markdown: string): Record<string, unknown> {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const result: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) continue;
    const [, key, rawValue] = keyValue;
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      result[key] = rawValue.slice(1, -1).split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    } else {
      result[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
  return result;
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[\s,]+/).map((tag) => tag.trim()).filter(Boolean);
  return [];
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
