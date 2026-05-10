import assert from 'node:assert/strict';
import test from 'node:test';
import { startConduitLoopbackService } from '../src/main/conduit/server.ts';

test('Conduit loopback service serves status and records events over HTTP', async () => {
  const service = await startConduitLoopbackService();
  try {
    const statusResponse = await fetch(`${service.url}/v0/status`);
    assert.equal(statusResponse.status, 200);
    const status = await statusResponse.json() as { modules: { memsocket: { health: string } } };
    assert.equal(status.modules.memsocket.health, 'not_configured');

    const eventResponse = await fetch(`${service.url}/v0/events`, {
      method: 'POST',
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
