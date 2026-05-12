import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createArtifact, exportArtifactPromptPackage, updateArtifactMetadata } from '../src/main/vault/vaultStore.ts';

test('updateArtifactMetadata edits title tags provenance and trust level', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  try {
    const created = await createArtifact(root, { title: 'Old title', html: '<title>Old title</title>', tags: ['demo'] });
    const updated = await updateArtifactMetadata(root, created.metadata.id, {
      title: ' New title ',
      tags: ['Review', 'demo', 'review', '  '],
      trustLevel: 'reviewed',
      trustReason: 'Reviewed for metadata edit test.',
      prompt: `See [[artifact:${created.metadata.id}]]`,
      provider: 'OpenAI',
      model: 'gpt-test',
      project: 'Launch Pack'
    });

    assert.equal(updated.metadata.title, 'New title');
    assert.deepEqual(updated.metadata.tags, ['demo', 'review']);
    assert.equal(updated.metadata.trustLevel, 'reviewed');
    assert.equal(updated.metadata.provider, 'OpenAI');
    assert.equal(updated.metadata.model, 'gpt-test');
    assert.equal(updated.metadata.project, 'Launch Pack');
    assert.deepEqual(updated.metadata.links, [created.metadata.id]);
    assert.notEqual(updated.metadata.updatedAt, created.metadata.updatedAt);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('exportArtifactPromptPackage includes metadata notes prompt visible text snapshots and fenced HTML', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  const html = '<!doctype html><html><head><title>Pack</title></head><body><h1>Artifact</h1></body></html>';
  try {
    const created = await createArtifact(root, { title: 'Pack', html, prompt: 'Make a useful artifact', tags: ['pack'] });
    const promptPackage = await exportArtifactPromptPackage(root, created.metadata.id);

    assert.match(promptPackage, /^# Artifact Context Package: Pack/);
    assert.match(promptPackage, /Artifact ID:/);
    assert.match(promptPackage, /## Visible text extracted from HTML/);
    assert.match(promptPackage, /Artifact/);
    assert.match(promptPackage, /## Snapshot history/);
    assert.match(promptPackage, /Make a useful artifact/);
    assert.match(promptPackage, /```html\n<!doctype html>/);
    assert.match(promptPackage, /Do not add network dependencies/);
    assert.match(promptPackage, /Do not paste secrets into external AI tools/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('updateArtifactMetadata rejects invalid trust levels from IPC callers', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  try {
    const created = await createArtifact(root, { title: 'Trust', html: '<title>Trust</title>' });
    await assert.rejects(
      () => updateArtifactMetadata(root, created.metadata.id, { trustLevel: 'network-enabled' as never }),
      /Invalid trust level/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('trust promotion requires a reason and records audit history', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imbas-trust-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const bundle = await createArtifact(root, { title: 'Trust review', html: '<h1>safe after review</h1>' });
  await assert.rejects(
    updateArtifactMetadata(root, bundle.metadata.id, { trustLevel: 'reviewed' }),
    /Trust level changes require a review reason/
  );
  const updated = await updateArtifactMetadata(root, bundle.metadata.id, { trustLevel: 'reviewed', trustReason: 'Reviewed source, no network dependencies, no credential handling.' });
  assert.equal(updated.metadata.trustLevel, 'reviewed');
  assert.equal(updated.metadata.trustAudit?.at(-1)?.from, 'untrusted');
  assert.equal(updated.metadata.trustAudit?.at(-1)?.to, 'reviewed');
  assert.match(await exportArtifactPromptPackage(root, bundle.metadata.id), /Trust audit/);
});
