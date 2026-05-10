import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDurableConduitRecordStore } from '../src/main/conduit/durableStore.ts';
import { createConduitRecordStore, handleConduitRequest } from '../src/main/conduit/localApi.ts';

test('Conduit exposes mobile pairing challenge and completion endpoints', async () => {
  const store = createConduitRecordStore();
  const challengeResponse = await handleConduitRequest(new Request('http://127.0.0.1/v0/mobile/pairing-challenges', {
    method: 'POST',
    body: JSON.stringify({ scopes: ['status.read', 'approvals.review'] })
  }), store);
  assert.equal(challengeResponse.status, 202);
  const challenge = (challengeResponse.body as { challenge: { id: string; code: string } }).challenge;
  assert.match(challenge.code, /^\d{6}$/);

  const completeResponse = await handleConduitRequest(new Request('http://127.0.0.1/v0/mobile/pairing-challenges/complete', {
    method: 'POST',
    body: JSON.stringify({ challengeId: challenge.id, code: challenge.code, deviceLabel: 'Johnathan Fold' })
  }), store);
  assert.equal(completeResponse.status, 200);
  const body = completeResponse.body as { session: { deviceLabel: string }; token: string };
  assert.equal(body.session.deviceLabel, 'Johnathan Fold');
  assert.match(body.token, /^imbas_mobile_/);
  assert.equal(JSON.stringify(store.mobile.sessions).includes(body.token), false);
});

test('durable Conduit store reloads mobile pairing sessions without raw token', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'imbas-mobile-'));
  const store = await createDurableConduitRecordStore({ dir });
  const challengeResponse = await handleConduitRequest(new Request('http://127.0.0.1/v0/mobile/pairing-challenges', { method: 'POST', body: '{}' }), store);
  const challenge = (challengeResponse.body as { challenge: { id: string; code: string } }).challenge;
  const completeResponse = await handleConduitRequest(new Request('http://127.0.0.1/v0/mobile/pairing-challenges/complete', {
    method: 'POST',
    body: JSON.stringify({ challengeId: challenge.id, code: challenge.code, deviceLabel: 'Fold' })
  }), store);
  const token = (completeResponse.body as { token: string }).token;

  const reloaded = await createDurableConduitRecordStore({ dir });
  assert.equal(reloaded.mobile.sessions.length, 1);
  assert.equal(JSON.stringify(reloaded.mobile).includes(token), false);
});
