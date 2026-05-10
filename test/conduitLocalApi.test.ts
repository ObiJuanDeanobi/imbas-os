import assert from 'node:assert/strict';
import test from 'node:test';
import { createConduitRecordStore, handleConduitRequest } from '../src/main/conduit/localApi.ts';

test('Conduit local API status reports implemented private-preview endpoints', async () => {
  const store = createConduitRecordStore();
  const response = await handleConduitRequest(new Request('http://127.0.0.1:0/v0/status'), store);
  assert.equal(response.status, 200);
  assert.deepEqual((response.body as { counts: unknown }).counts, { events: 0, runs: 0 });
});

test('Conduit local API accepts and redacts context events', async () => {
  const store = createConduitRecordStore();
  const response = await handleConduitRequest(new Request('http://127.0.0.1:0/v0/events', {
    method: 'POST',
    body: JSON.stringify({
      connector: 'OpenClaw',
      agent: 'main',
      type: 'observation',
      layer: 'episodic',
      visibility: 'private',
      text: 'Use secret://github/token but never expose token=ghp_abcdefghijklmnopqrstuvwxyz123456.'
    })
  }), store);
  assert.equal(response.status, 202);
  assert.equal(store.events.length, 1);
  assert.equal(store.events[0].text.includes('secret://github/token'), false);
  assert.equal(store.events[0].text.includes('ghp_abcdefghijklmnopqrstuvwxyz123456'), false);
});

test('Conduit local API rejects invalid secret pointer events', async () => {
  const store = createConduitRecordStore();
  const response = await handleConduitRequest(new Request('http://127.0.0.1:0/v0/events', {
    method: 'POST',
    body: JSON.stringify({
      connector: 'OpenClaw',
      agent: 'main',
      type: 'secret_access',
      layer: 'episodic',
      visibility: 'secret_pointer',
      text: 'Used the GitHub token directly.'
    })
  }), store);
  assert.equal(response.status, 400);
});

test('Conduit local API records run summaries', async () => {
  const store = createConduitRecordStore();
  const response = await handleConduitRequest(new Request('http://127.0.0.1:0/v0/runs', {
    method: 'POST',
    body: JSON.stringify({
      connector: 'OpenClaw',
      agent: 'main',
      runId: 'run-1',
      task: 'Seed Imbas OS repo',
      outcome: 'completed',
      summary: 'Created private repo and ran verification.',
      verification: ['npm run package:dev']
    })
  }), store);
  assert.equal(response.status, 202);
  assert.equal(store.runs.length, 1);
});
