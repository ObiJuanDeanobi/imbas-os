import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createArtifact } from '../src/main/vault/vaultStore.ts';
import { createMarkdownPage, getMarkdownGraph, listMarkdownPages, readMarkdownPageFromVault, searchMarkdownPagesInVault, updateMarkdownPage } from '../src/main/markdown/markdownStore.ts';

test('vault-owned Markdown pages can be created, read, searched, linked, and updated', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-md-'));
  try {
    const artifact = await createArtifact(root, { title: 'Linked Artifact', html: '<title>Linked</title>' });
    const created = await createMarkdownPage(root, {
      title: 'Project Note',
      markdown: `# Project Note\n\nSee [[artifact:${artifact.metadata.id}]].`,
      tags: ['project']
    });

    assert.equal(created.node.sourceOwnership, 'vault-owned');
    assert.match(created.node.relativePath, /^pages\/project-note\.md$/);
    assert.deepEqual(created.node.artifactLinks, [artifact.metadata.id]);

    const pages = await listMarkdownPages(root);
    assert.equal(pages.length, 1);
    assert.equal(pages[0].title, 'Project Note');

    const read = await readMarkdownPageFromVault(root, created.node.id);
    assert.match(read.markdown, /Project Note/);

    const search = await searchMarkdownPagesInVault(root, 'see');
    assert.deepEqual(search.map((result) => ({ id: result.id, kind: result.kind, ownership: result.sourceOwnership, reason: result.matchReason })), [
      { id: created.node.id, kind: 'wiki', ownership: 'vault-owned', reason: 'markdown' }
    ]);

    const graph = await getMarkdownGraph(root);
    assert.ok(graph.edges.some((edge) => edge.from === created.node.id && edge.to === artifact.metadata.id && edge.kind === 'artifact-link'));

    const updated = await updateMarkdownPage(root, created.node.id, '# Project Note\n\nUpdated body.');
    assert.match(updated.markdown, /Updated body/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
