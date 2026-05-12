import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticateMobileSession, completePairingChallenge, createMobilePairingStore, createPairingChallenge, refreshPairingStatuses, revokeMobileSession } from '../src/main/mobile/pairing.ts';

test('mobile pairing creates one-time challenge and returns token only on completion', async () => {
  const store = createMobilePairingStore();
  const challenge = await createPairingChallenge(store, { scopes: ['status.read', 'approvals.review'], now: new Date('2026-05-10T22:30:00Z') });
  assert.match(challenge.code, /^\d{6}$/);
  assert.equal(JSON.stringify(store).includes(challenge.code), true, 'private preview keeps display code in memory for desktop UI');
  assert.equal(JSON.stringify(store).includes('imbas_mobile_'), false);

  const completed = await completePairingChallenge(store, { challengeId: challenge.id, code: challenge.code, deviceLabel: 'Maintainer Fold', now: new Date('2026-05-10T22:31:00Z') });
  assert.match(completed.token, /^imbas_mobile_/);
  assert.equal(authenticateMobileSession(store, completed.token, 'approvals.review')?.deviceLabel, 'Maintainer Fold');
  assert.equal(authenticateMobileSession(store, completed.token, 'capture.write'), null);
});

test('mobile pairing rejects expired challenges and revoked sessions', async () => {
  const store = createMobilePairingStore();
  const challenge = await createPairingChallenge(store, { ttlMs: 1000, now: new Date('2026-05-10T22:30:00Z') });
  refreshPairingStatuses(store, new Date('2026-05-10T22:30:02Z'));
  await assert.rejects(() => completePairingChallenge(store, { challengeId: challenge.id, code: challenge.code, deviceLabel: 'Late phone' }), /expired/);

  const active = await createPairingChallenge(store);
  const completed = await completePairingChallenge(store, { challengeId: active.id, code: active.code, deviceLabel: 'Phone' });
  await revokeMobileSession(store, completed.session.id);
  assert.equal(authenticateMobileSession(store, completed.token, 'status.read'), null);
});
