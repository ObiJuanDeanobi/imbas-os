import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createArtifact, updateArtifactNotes } from '../src/main/vault/vaultStore.ts';
import { rebuildSearchIndex, searchArtifactsWithIndex, searchIndexPath } from '../src/main/vault/searchIndex.ts';

test('rebuildSearchIndex creates a rebuildable SQLite FTS cache from bundles', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  try {
    const first = await createArtifact(root, { title: 'Compliance evidence pack', html: '<title>Compliance evidence pack</title><main>ISO 27001 controls</main>', tags: ['compliance'] });
    await createArtifact(root, { title: 'Learning quiz', html: '<title>Learning quiz</title><main>spaced repetition lesson</main>', project: 'Curriculum Hub', tags: ['lesson'] });
    await updateArtifactNotes(root, first.metadata.id, '# Evidence\n\nSOC2 bridge memo.');

    const stats = await rebuildSearchIndex(root);
    assert.equal(stats.indexPath, searchIndexPath(root));
    assert.equal(stats.artifactCount, 2);

    const compliance = await searchArtifactsWithIndex(root, 'SOC2');
    assert.equal(compliance.length, 1);
    assert.equal(compliance[0].title, 'Compliance evidence pack');
    assert.equal(compliance[0].matchReason, 'notes');

    await rm(searchIndexPath(root), { force: true });
    await rebuildSearchIndex(root);
    const html = await searchArtifactsWithIndex(root, 'spaced');
    assert.equal(html.length, 1);
    assert.equal(html[0].matchReason, 'html');

    const project = await searchArtifactsWithIndex(root, 'Curriculum Hub');
    assert.equal(project.length, 1);
    assert.equal(project[0].matchReason, 'project');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('indexed search returns empty results for quote-only queries', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  try {
    await createArtifact(root, { title: 'Safe query', html: '<title>Safe query</title><main>searchable</main>' });
    await rebuildSearchIndex(root);
    assert.deepEqual(await searchArtifactsWithIndex(root, '"""'), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
