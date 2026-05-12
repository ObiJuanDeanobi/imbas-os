import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createConduitRecordStore, handleConduitRequest } from '../src/main/conduit/localApi.ts';
import { readArtifact } from '../src/main/vault/vaultStore.ts';

test('Conduit saves generated artifacts through vault API and records Runledger entry', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imbas-conduit-artifacts-'));
  const store = createConduitRecordStore();
  store.vaultRoot = root;
  const response = await handleConduitRequest(new Request('http://127.0.0.1/v0/artifacts', {
    method: 'POST',
    body: JSON.stringify({ title: 'Connector Artifact', html: '<!doctype html><title>Connector Artifact</title><h1>Hello</h1>', sourceType: 'generated', project: 'Conduit', tags: ['connector'] })
  }), store);
  assert.equal(response.status, 202);
  const body = response.body as { artifact: { metadata: { id: string; title: string; trustLevel: string } } };
  assert.equal(body.artifact.metadata.title, 'Connector Artifact');
  assert.equal(body.artifact.metadata.trustLevel, 'untrusted');
  const stored = await readArtifact(root, body.artifact.metadata.id);
  assert.match(stored.html, /Hello/);
  assert.equal(store.runledger.some((entry) => entry.kind === 'event' && entry.title.includes('Saved artifact')), true);
});

test('Conduit redaction audit also writes Sanctum Runledger entries', async () => {
  const store = createConduitRecordStore();
  await handleConduitRequest(new Request('http://127.0.0.1/v0/events', {
    method: 'POST',
    body: JSON.stringify({ connector: 'OpenClaw', agent: 'main', type: 'observation', layer: 'episodic', visibility: 'private', text: 'Never leak token=FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456.' })
  }), store);
  assert.equal(store.sanctumAudit.length, 1);
  assert.equal(store.runledger.some((entry) => entry.kind === 'sanctum' && entry.outcome === 'redacted'), true);
});
