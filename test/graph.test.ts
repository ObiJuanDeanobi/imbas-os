import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createArtifact, getArtifactGraph, updateArtifactNotes } from '../src/main/vault/vaultStore.ts';

test('getArtifactGraph exposes explicit artifact links between known nodes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  try {
    const target = await createArtifact(root, { title: 'Target', html: '<title>Target</title>' });
    const source = await createArtifact(root, { title: 'Source', html: '<title>Source</title>' });
    await updateArtifactNotes(root, source.metadata.id, `# Source\n\nSee [[artifact:${target.metadata.id}]] and [[artifact:99999999-9999-4999-8999-999999999999]].`);

    const graph = await getArtifactGraph(root);
    assert.equal(graph.nodes.length, 2);
    assert.deepEqual(graph.edges, [{ from: source.metadata.id, to: target.metadata.id, kind: 'artifact-link' }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
