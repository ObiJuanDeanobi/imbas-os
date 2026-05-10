import assert from 'node:assert/strict';
import test from 'node:test';
import { createConduitRecordStore, handleConduitRequest } from '../src/main/conduit/localApi.ts';

test('Conduit local API status reports implemented private-preview endpoints', async () => {
  const store = createConduitRecordStore();
  const response = await handleConduitRequest(new Request('http://127.0.0.1:0/v0/status'), store);
  assert.equal(response.status, 200);
  assert.deepEqual((response.body as { counts: unknown }).counts, { events: 0, runs: 0, runledger: 0, lorekeeperProposals: 0, mobileSessions: 0 });
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

test('Conduit local API searches events and builds local context packs', async () => {
  const store = createConduitRecordStore();
  await handleConduitRequest(new Request('http://127.0.0.1:0/v0/events', {
    method: 'POST',
    body: JSON.stringify({
      connector: 'OpenClaw',
      agent: 'main',
      type: 'observation',
      layer: 'episodic',
      visibility: 'private',
      text: 'OpenClaw shadow connector should feed Imbas OS Sprint 2.'
    })
  }), store);

  const search = await handleConduitRequest(new Request('http://127.0.0.1:0/v0/search', {
    method: 'POST',
    body: JSON.stringify({ query: 'Sprint 2' })
  }), store);
  assert.equal(search.status, 200);
  assert.equal((search.body as { backend: string }).backend, 'conduit-local');
  assert.equal((search.body as { results: unknown[] }).results.length, 1);

  const pack = await handleConduitRequest(new Request('http://127.0.0.1:0/v0/context-packs', {
    method: 'POST',
    body: JSON.stringify({ task: 'OpenClaw shadow connector' })
  }), store);
  assert.equal(pack.status, 200);
  assert.equal((pack.body as { backend: string }).backend, 'conduit-local');
  assert.equal((pack.body as { totalItems: number }).totalItems, 1);
});

test('Conduit writes accepted events to Memsocket when enabled', async () => {
  const store = createConduitRecordStore();
  const writes: string[] = [];
  store.modules.memsocket = { ...store.modules.memsocket, enabled: true, available: true, configured: true, health: 'ok' };
  store.memsocket = {
    async writeEvent(event) {
      writes.push(event.text);
      return { status: 'ok', stdout: '{}', stderr: '', json: {} };
    },
    async search() {
      return { status: 'ok', stdout: '{}', stderr: '', json: { results: [] } };
    },
    async contextPack() {
      return { status: 'ok', stdout: '{}', stderr: '', json: { items: [] } };
    }
  };

  const response = await handleConduitRequest(new Request('http://127.0.0.1:0/v0/events', {
    method: 'POST',
    body: JSON.stringify({
      connector: 'OpenClaw',
      agent: 'main',
      type: 'observation',
      layer: 'episodic',
      visibility: 'private',
      text: 'Write through to Memsocket'
    })
  }), store);
  assert.equal(response.status, 202);
  assert.deepEqual(writes, ['Write through to Memsocket']);
});
