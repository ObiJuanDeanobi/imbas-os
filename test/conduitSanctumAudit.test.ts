import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDurableConduitRecordStore } from '../src/main/conduit/durableStore.ts';
import { createConduitRecordStore, handleConduitRequest } from '../src/main/conduit/localApi.ts';

test('Conduit records Sanctum audit entries when input is redacted', async () => {
  const store = createConduitRecordStore();
  const response = await handleConduitRequest(new Request('http://127.0.0.1/v0/events', {
    method: 'POST',
    body: JSON.stringify({ connector: 'OpenClaw', agent: 'main', type: 'observation', layer: 'episodic', visibility: 'private', text: 'token=ghp_abcdefghijklmnopqrstuvwxyz123456' })
  }), store);
  assert.equal(response.status, 202);
  assert.equal(store.sanctumAudit.length, 1);
  assert.equal(store.sanctumAudit[0].action, 'redacted_input');
  assert.equal(JSON.stringify(store.sanctumAudit).includes('ghp_abcdefghijklmnopqrstuvwxyz123456'), false);
});

test('durable Conduit store reloads Sanctum audit entries', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'imbas-conduit-audit-'));
  const store = await createDurableConduitRecordStore({ dir });
  await handleConduitRequest(new Request('http://127.0.0.1/v0/runs', {
    method: 'POST',
    body: JSON.stringify({ connector: 'OpenClaw', agent: 'main', runId: 'run-audit', task: 'Use token=ghp_abcdefghijklmnopqrstuvwxyz123456', outcome: 'completed', summary: 'Redaction happened' })
  }), store);
  const reloaded = await createDurableConduitRecordStore({ dir });
  assert.equal(reloaded.sanctumAudit.length, 1);
  assert.equal(reloaded.sanctumAudit[0].recordKind, 'run');
});
