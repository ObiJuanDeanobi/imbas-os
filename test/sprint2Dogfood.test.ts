import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDurableConduitRecordStore } from '../src/main/conduit/durableStore.ts';
import { handleConduitRequest } from '../src/main/conduit/localApi.ts';

test('Sprint 2 dogfood loop stores OpenClaw event, searches it, and builds context pack', async () => {
  const store = await createDurableConduitRecordStore({ dir: await mkdtemp(path.join(os.tmpdir(), 'imbas-dogfood-')) });
  const runId = 'openclaw-shadow-test';
  await handleConduitRequest(new Request('http://127.0.0.1/v0/runs', {
    method: 'POST',
    body: JSON.stringify({ connector: 'OpenClaw', agent: 'main', runId, task: 'Sprint 2 dogfood loop', outcome: 'completed', summary: 'Fed Imbas OS with a shadow run.' })
  }), store);
  await handleConduitRequest(new Request('http://127.0.0.1/v0/events', {
    method: 'POST',
    body: JSON.stringify({ connector: 'OpenClaw', agent: 'main', runId, projectId: 'imbas-os', type: 'run_summary', layer: 'episodic', visibility: 'private', text: 'Sprint 2 dogfood loop fed Imbas OS.' })
  }), store);

  const search = await handleConduitRequest(new Request('http://127.0.0.1/v0/search', { method: 'POST', body: JSON.stringify({ query: 'dogfood loop' }) }), store);
  assert.equal((search.body as { backend: string }).backend, 'conduit-local');
  assert.equal((search.body as { results: unknown[] }).results.length, 2);

  const pack = await handleConduitRequest(new Request('http://127.0.0.1/v0/context-packs', { method: 'POST', body: JSON.stringify({ task: 'dogfood loop' }) }), store);
  assert.equal((pack.body as { totalItems: number }).totalItems, 2);
});
