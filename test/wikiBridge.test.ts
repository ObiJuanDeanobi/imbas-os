import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildWikiBridgeReport, extractWikilinks, indexMarkdownVault, mergeArtifactAndWikiGraphs, readMarkdownPage, searchMarkdownPages } from '../src/main/wiki/wikiBridge.ts';

test('extractWikilinks preserves labels and ignores artifact pseudo-links', () => {
  assert.deepEqual(extractWikilinks('See [[Roadmap|the map]], ![[Brief]], and [[artifact:12345678-1234-1234-1234-123456789abc]].'), [
    { target: 'Roadmap', label: 'the map', embed: false },
    { target: 'Brief', label: undefined, embed: true }
  ]);
});

test('indexMarkdownVault builds a read-only wikilink and artifact graph', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-wiki-'));
  const artifactId = '12345678-1234-1234-1234-123456789abc';
  try {
    await writeFile(path.join(root, 'Brief.md'), '---\ntitle: Project Brief\ntags: [project, artifact-vault]\n---\n# Brief\nSee [[Roadmap]] and [[artifact:12345678-1234-1234-1234-123456789abc]].\n');
    await writeFile(path.join(root, 'Roadmap.md'), '# Roadmap\nBack to [[Brief|brief]].\n');
    const wikiGraph = await indexMarkdownVault(root);
    assert.equal(wikiGraph.nodes.length, 2);
    assert.ok(wikiGraph.nodes.some((node) => node.kind === 'wiki' && node.title === 'Project Brief'));
    assert.ok(wikiGraph.nodes.some((node) => node.kind === 'wiki' && node.sourceOwnership === 'external-readonly'));
    assert.ok(wikiGraph.edges.some((edge) => edge.from === 'wiki:Brief.md' && edge.to === 'wiki:Roadmap.md' && edge.kind === 'wikilink'));
    assert.ok(wikiGraph.edges.some((edge) => edge.from === 'wiki:Brief.md' && edge.to === artifactId && edge.kind === 'artifact-link'));

    const merged = mergeArtifactAndWikiGraphs({ nodes: [{ id: artifactId, kind: 'artifact', title: 'Artifact', tags: [] }], edges: [] }, wikiGraph);
    assert.ok(merged.edges.some((edge) => edge.to === artifactId));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('readMarkdownPage and searchMarkdownPages expose read-only Markdown pages', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-wiki-'));
  try {
    await writeFile(path.join(root, 'Project.md'), '---\ntitle: Unified Vault Project\ntags: [project]\n---\n# Project\nMarkdown plus HTML artifacts.\n');
    const page = await readMarkdownPage(root, 'wiki:Project.md');
    assert.equal(page.node.title, 'Unified Vault Project');
    assert.equal(page.node.sourceOwnership, 'external-readonly');
    assert.match(page.markdown, /Markdown plus HTML/);

    const results = await searchMarkdownPages(root, 'html artifacts');
    assert.deepEqual(results.map((result) => ({ id: result.id, kind: result.kind, matchReason: result.matchReason, sourceOwnership: result.sourceOwnership })), [
      { id: 'wiki:Project.md', kind: 'wiki', matchReason: 'markdown', sourceOwnership: 'external-readonly' }
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('buildWikiBridgeReport summarizes unresolved links and migration posture', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-wiki-'));
  const artifactId = '12345678-1234-1234-1234-123456789abc';
  try {
    await writeFile(path.join(root, 'Brief.md'), `# Brief\nSee [[Roadmap]], [[Missing Page]], [[artifact:${artifactId}]], and [[artifact:99999999-9999-4999-8999-999999999999]].\n`);
    await writeFile(path.join(root, 'Roadmap.md'), '# Roadmap\nBack to [[Brief]].\n');
    await writeFile(path.join(root, 'Orphan.md'), '# Orphan\nNo links here.\n');
    const report = await buildWikiBridgeReport(root, { nodes: [{ id: artifactId, kind: 'artifact', title: 'Artifact', tags: [] }], edges: [] });
    assert.equal(report.pageCount, 3);
    assert.equal(report.wikilinkCount, 3);
    assert.equal(report.resolvedWikilinkCount, 2);
    assert.deepEqual(report.unresolvedWikilinks, [{ from: 'Brief.md', target: 'Missing Page' }]);
    assert.equal(report.artifactLinkCount, 2);
    assert.equal(report.resolvedArtifactLinkCount, 1);
    assert.equal(report.unresolvedArtifactLinks[0].artifactId, '99999999-9999-4999-8999-999999999999');
    assert.deepEqual(report.orphanPages, ['Orphan.md']);
    assert.equal(report.recommendation, 'investigate');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
