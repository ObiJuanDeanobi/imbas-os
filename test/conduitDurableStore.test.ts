import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDurableConduitRecordStore } from '../src/main/conduit/durableStore.ts';
import { handleConduitRequest } from '../src/main/conduit/localApi.ts';

test('durable Conduit store reloads accepted events and runs from JSONL', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'imbas-conduit-'));
  const store = await createDurableConduitRecordStore({ dir });
  await handleConduitRequest(new Request('http://127.0.0.1/v0/events', {
    method: 'POST',
    body: JSON.stringify({ connector: 'OpenClaw', agent: 'main', type: 'observation', layer: 'episodic', visibility: 'private', text: 'Durable event' })
  }), store);
  await handleConduitRequest(new Request('http://127.0.0.1/v0/runs', {
    method: 'POST',
    body: JSON.stringify({ connector: 'OpenClaw', agent: 'main', runId: 'run-durable', task: 'Persist', outcome: 'completed', summary: 'Persisted run' })
  }), store);

  const reloaded = await createDurableConduitRecordStore({ dir });
  assert.equal(reloaded.events.length, 1);
  assert.equal(reloaded.runs.length, 1);
  assert.equal(reloaded.events[0].text, 'Durable event');
});
