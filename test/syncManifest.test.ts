import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createArtifact, updateArtifactMetadata, updateArtifactNotes } from '../src/main/vault/vaultStore.ts';
import { getOrCreateSyncNode, getSyncStatus, rebuildSyncManifest } from '../src/main/sync/syncManifest.ts';

test('getOrCreateSyncNode creates a stable local node identity', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-sync-'));
  try {
    const first = await getOrCreateSyncNode(root, 'Test Node');
    const second = await getOrCreateSyncNode(root, 'Other Name');
    assert.equal(first.id, second.id);
    assert.equal(second.displayName, 'Test Node');
    assert.match(first.id, /^[a-f0-9-]{36}$/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rebuildSyncManifest records deterministic source-file entries and skips rebuildable caches', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-sync-'));
  try {
    const node = await getOrCreateSyncNode(root, 'Sync Test');
    const artifact = await createArtifact(root, { title: 'Sync Artifact', html: '<title>Sync</title>' });
    await writeFile(path.join(root, '.vault', 'index.sqlite'), 'cache only');

    const first = await rebuildSyncManifest(root, node.id);
    const second = await rebuildSyncManifest(root, node.id);
    assert.deepEqual(first.entries.map((entry) => entry.path), second.entries.map((entry) => entry.path));
    assert.ok(first.entries.some((entry) => entry.path === `artifacts/${artifact.metadata.id}/artifact.html` && entry.logicalType === 'artifact-html'));
    assert.ok(first.entries.some((entry) => entry.path === `artifacts/${artifact.metadata.id}/metadata.json` && entry.logicalType === 'artifact-metadata' && entry.trustLevel === 'untrusted'));
    assert.ok(first.entries.some((entry) => entry.path === `artifacts/${artifact.metadata.id}/notes.md` && entry.logicalType === 'artifact-notes'));
    assert.ok(!first.entries.some((entry) => entry.path.includes('index.sqlite')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('getSyncStatus reports local changes and conflict candidates without silent overwrites', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-sync-'));
  try {
    const localNode = await getOrCreateSyncNode(root, 'Local');
    const artifact = await createArtifact(root, { title: 'Conflict Artifact', html: '<title>Conflict</title>' });
    await rebuildSyncManifest(root, 'remote-node');

    await updateArtifactNotes(root, artifact.metadata.id, '# Conflict Artifact\n\nLocal edit.');
    await updateArtifactMetadata(root, artifact.metadata.id, { trustLevel: 'reviewed' });

    const status = await getSyncStatus(root, localNode.id);
    assert.ok(status.changedFiles.some((file) => file.path === `artifacts/${artifact.metadata.id}/notes.md` && file.logicalType === 'artifact-notes'));
    assert.ok(status.conflictCandidates.some((file) => file.path === `artifacts/${artifact.metadata.id}/metadata.json` && file.reason === 'trust-level-change-requires-review'));
    assert.equal(status.localNode.id, localNode.id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
