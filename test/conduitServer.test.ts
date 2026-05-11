import assert from 'node:assert/strict';
import test from 'node:test';
import { startConduitLoopbackService } from '../src/main/conduit/server.ts';

test('Conduit loopback service serves status and accepts scoped mobile capture over HTTP', async () => {
  const service = await startConduitLoopbackService();
  try {
    const statusResponse = await fetch(`${service.url}/v0/status`);
    assert.equal(statusResponse.status, 200);
    const status = await statusResponse.json() as { modules: { memsocket: { health: string } } };
    assert.equal(status.modules.memsocket.health, 'not_configured');

    const challengeResponse = await fetch(`${service.url}/v0/mobile/pairing-challenges`, { method: 'POST', body: '{}' });
    assert.equal(challengeResponse.status, 202);
    const challenge = (await challengeResponse.json()) as { challenge: { id: string; code: string } };
    const completeResponse = await fetch(`${service.url}/v0/mobile/pairing-challenges/complete`, {
      method: 'POST',
      body: JSON.stringify({ challengeId: challenge.challenge.id, code: challenge.challenge.code, deviceLabel: 'Loopback test' })
    });
    assert.equal(completeResponse.status, 200);
    const completed = (await completeResponse.json()) as { token: string };

    const rejectedRunledgerResponse = await fetch(`${service.url}/v0/runledger`);
    assert.equal(rejectedRunledgerResponse.status, 401);
    const runledgerResponse = await fetch(`${service.url}/v0/runledger`, { headers: { Authorization: `Bearer ${completed.token}` } });
    assert.equal(runledgerResponse.status, 200);

    const rejectedEventResponse = await fetch(`${service.url}/v0/events`, {
      method: 'POST',
      body: JSON.stringify({ connector: 'OpenClaw', agent: 'main', type: 'observation', layer: 'episodic', visibility: 'private', text: 'unauthenticated' })
    });
    assert.equal(rejectedEventResponse.status, 401);

    const rejectedProposalWrite = await fetch(`${service.url}/v0/wiki/proposals`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Should not write over loopback', markdown: 'Nope', rationale: 'HTTP hardening', sources: ['test://server'] })
    });
    assert.equal(rejectedProposalWrite.status, 403);

    const eventResponse = await fetch(`${service.url}/v0/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${completed.token}` },
      body: JSON.stringify({
        connector: 'OpenClaw',
        agent: 'main',
        type: 'observation',
        layer: 'episodic',
        visibility: 'private',
        text: 'Loopback Conduit smoke event'
      })
    });
    assert.equal(eventResponse.status, 202);
    assert.equal(service.store.events.length, 1);
  } finally {
    await service.close();
  }
});
