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
      text: 'Use secret://github/token but never expose token=FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456.'
    })
  }), store);
  assert.equal(response.status, 202);
  assert.equal(store.events.length, 1);
  assert.equal(store.events[0].text.includes('secret://github/token'), false);
  assert.equal(store.events[0].text.includes('FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456'), false);
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
  const packBody = pack.body as { items: { provenance: { uri: string; kind: string; confidence: string }[] }[] };
  assert.equal(packBody.items[0].provenance[0].uri, 'conduit://events/0');
  assert.equal(packBody.items[0].provenance[0].kind, 'event');
});

test('Conduit local API builds a run replay timeline across runs, events, ledger, proposals, and audit', async () => {
  const store = createConduitRecordStore();
  await handleConduitRequest(new Request('http://127.0.0.1:0/v0/events', {
    method: 'POST',
    body: JSON.stringify({ connector: 'OpenClaw', agent: 'main', runId: 'run-replay-1', type: 'observation', layer: 'episodic', visibility: 'private', text: 'Replay event with token=FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456.' })
  }), store);
  await handleConduitRequest(new Request('http://127.0.0.1:0/v0/runs', {
    method: 'POST',
    body: JSON.stringify({ connector: 'OpenClaw', agent: 'main', runId: 'run-replay-1', task: 'Replay slice', outcome: 'completed', summary: 'Added replay timeline.' })
  }), store);
  await handleConduitRequest(new Request('http://127.0.0.1:0/v0/wiki/proposals', {
    method: 'POST',
    body: JSON.stringify({ title: 'Replay note', markdown: 'Replay timeline exists.', rationale: 'Durable run review.', connector: 'OpenClaw', agent: 'main', sources: ['openclaw://runs/run-replay-1'] })
  }), store);

  const replay = await handleConduitRequest(new Request('http://127.0.0.1:0/v0/replay/runs/run-replay-1'), store);
  assert.equal(replay.status, 200);
  const body = replay.body as { runId: string; timeline: { kind: string }[]; counts: Record<string, number> };
  assert.equal(body.runId, 'run-replay-1');
  assert.equal(body.counts.runs, 1);
  assert.equal(body.timeline.some((item) => item.kind === 'sanctum'), true);
  assert.equal(body.timeline.some((item) => item.kind === 'lorekeeper_proposal'), true);
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

test('Conduit dispatches Agent Console messages to configured OpenClaw dispatcher and records Runledger', async () => {
  const store = createConduitRecordStore();
  const received: string[] = [];
  store.openclawDispatcher = {
    async dispatch(request) {
      received.push(request.message);
      return { status: 'completed', reply: 'OpenClaw reply: next safe task is to verify the connector.', sessionId: 'session:test', runId: 'openclaw-run:test', transport: 'test' };
    }
  };

  const response = await handleConduitRequest(new Request('http://127.0.0.1:0/v0/agents/openclaw/dispatch', {
    method: 'POST',
    body: JSON.stringify({ agent: 'OpenClaw', mode: 'chat', message: 'Please inspect token=FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456 and summarize.' })
  }), store);

  assert.equal(response.status, 200);
  assert.equal(received.length, 1);
  assert.equal(received[0].includes('FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456'), false);
  assert.equal(store.runs.length, 1);
  assert.equal(store.runs[0].outcome, 'completed');
  assert.equal(store.runs[0].summary, 'OpenClaw reply: next safe task is to verify the connector.');
  assert.equal(store.runledger.some((entry) => entry.title.startsWith('Agent Console dispatch:')), true);
  assert.equal(JSON.stringify(response.body).includes('FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456'), false);
});

test('Conduit blocks non-OpenClaw Agent Console live dispatch targets', async () => {
  const store = createConduitRecordStore();
  store.openclawDispatcher = {
    async dispatch() {
      throw new Error('should not be called');
    }
  };

  const response = await handleConduitRequest(new Request('http://127.0.0.1:0/v0/agents/openclaw/dispatch', {
    method: 'POST',
    body: JSON.stringify({ agent: 'Hermes', mode: 'chat', message: 'Hello Hermes' })
  }), store);

  assert.equal(response.status, 501);
  assert.equal(store.runs.length, 1);
  assert.equal(store.runs[0].outcome, 'blocked');
  assert.equal(store.runledger[0].outcome, 'blocked');
});
