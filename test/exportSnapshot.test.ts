import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createArtifact, createSnapshot, exportArtifactJson, exportArtifactMarkdown, listSnapshots, restoreSnapshot, updateArtifactNotes } from '../src/main/vault/vaultStore.ts';

test('notes can be updated and exported with provenance', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  try {
    const created = await createArtifact(root, {
      title: 'Decision matrix',
      html: '<!doctype html><title>Decision matrix</title><main>choices</main>',
      prompt: 'Compare the product directions.',
      tags: ['strategy']
    });
    await updateArtifactNotes(root, created.metadata.id, '# Decision matrix\n\nPicked option B.');
    const markdown = await exportArtifactMarkdown(root, created.metadata.id);
    assert.match(markdown, /^# Decision matrix/);
    assert.match(markdown, /Picked option B/);
    assert.match(markdown, /Compare the product directions/);
    const json = JSON.parse(await exportArtifactJson(root, created.metadata.id));
    assert.equal(json.metadata.id, created.metadata.id);
    assert.match(json.notes, /Picked option B/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('createSnapshot increments metadata and writes snapshot files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  try {
    const created = await createArtifact(root, { title: 'Snapshot me', html: '<title>Snapshot me</title>' });
    const metadata = await createSnapshot(root, created.metadata.id);
    assert.equal(metadata.snapshotCount, 2);
    const snapshots = await readdir(path.join(created.bundlePath, 'snapshots'));
    assert.equal(snapshots.filter((file) => file.endsWith('.html')).length, 2);
    assert.equal(snapshots.filter((file) => file.endsWith('.json')).length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('restoreSnapshot restores previous html and records a new snapshot', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  try {
    const created = await createArtifact(root, { title: 'Original', html: '<title>Original</title><p>one</p>', prompt: 'v1' });
    const [firstSnapshot] = await listSnapshots(root, created.metadata.id);
    await writeFile(path.join(created.bundlePath, 'artifact.html'), '<title>Changed</title><p>two</p>');
    await createSnapshot(root, created.metadata.id);

    const restored = await restoreSnapshot(root, created.metadata.id, firstSnapshot.id);
    assert.match(restored.html, /one/);
    assert.equal(restored.metadata.title, 'Original');
    assert.equal(restored.metadata.prompt, 'v1');
    assert.equal(restored.metadata.snapshotCount, 3);
    assert.match(await readFile(path.join(created.bundlePath, 'artifact.html'), 'utf8'), /one/);
    assert.equal((await listSnapshots(root, created.metadata.id)).length, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
