import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDurableConduitRecordStore } from '../src/main/conduit/durableStore.ts';
import { createConduitRecordStore, handleConduitRequest } from '../src/main/conduit/localApi.ts';

test('Conduit records runs into Runledger timeline', async () => {
  const store = createConduitRecordStore();
  await handleConduitRequest(new Request('http://127.0.0.1/v0/runs', {
    method: 'POST',
    body: JSON.stringify({ connector: 'OpenClaw', agent: 'main', runId: 'run-4', task: 'Sprint 4', outcome: 'completed', summary: 'Added Runledger.' })
  }), store);
  const response = await handleConduitRequest(new Request('http://127.0.0.1/v0/runledger?query=Runledger'), store);
  assert.equal(response.status, 200);
  const body = response.body as { entries: { kind: string; title: string }[] };
  assert.equal(body.entries.length, 1);
  assert.equal(body.entries[0].kind, 'run');
});

test('Conduit accepts Lorekeeper wiki proposals without mutating wiki pages', async () => {
  const store = createConduitRecordStore();
  const response = await handleConduitRequest(new Request('http://127.0.0.1/v0/wiki/proposals', {
    method: 'POST',
    body: JSON.stringify({ title: 'Sprint 4 note', markdown: '# Sprint 4\n\nRunledger + Lorekeeper.', rationale: 'Promote durable project knowledge.', connector: 'OpenClaw', agent: 'main', sources: ['openclaw://runs/run-4'] })
  }), store);
  assert.equal(response.status, 202);
  assert.equal(store.lorekeeperProposals.length, 1);
  assert.equal(store.runledger.length, 1);

  const list = await handleConduitRequest(new Request('http://127.0.0.1/v0/wiki/proposals?query=Sprint%204'), store);
  assert.equal((list.body as { proposals: unknown[] }).proposals.length, 1);
});

test('durable Conduit store reloads Runledger and Lorekeeper proposal state', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'imbas-lorekeeper-'));
  const store = await createDurableConduitRecordStore({ dir });
  await handleConduitRequest(new Request('http://127.0.0.1/v0/wiki/proposals', {
    method: 'POST',
    body: JSON.stringify({ title: 'Persisted note', markdown: '# Persisted', rationale: 'Test durable proposal', connector: 'OpenClaw', agent: 'main' })
  }), store);
  const reloaded = await createDurableConduitRecordStore({ dir });
  assert.equal(reloaded.lorekeeperProposals.length, 1);
  assert.equal(reloaded.runledger.length, 1);
});
