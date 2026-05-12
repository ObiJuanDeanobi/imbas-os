import assert from 'node:assert/strict';
import test from 'node:test';
import { imbasEventToMemsocketPayload } from '../src/main/memsocket/adapter.ts';

test('maps Imbas context events to Memsocket payload shape', () => {
  const payload = imbasEventToMemsocketPayload({
    connector: 'OpenClaw',
    agent: 'main',
    runId: 'run-123',
    projectId: 'imbas-os',
    type: 'decision',
    layer: 'semantic',
    visibility: 'private',
    text: 'Use Imbas OS as the umbrella product.',
    source: { uri: 'file://docs/architecture/subsystems.md' },
    links: ['artifact://demo']
  });

  assert.equal(payload.namespace, 'imbas-os');
  assert.equal(payload.session_id, 'run-123');
  assert.equal(payload.event_type, 'decision');
  assert.equal(payload.actor_kind, 'agent');
  assert.equal(payload.actor_id, 'main');
  assert.deepEqual(payload.layers, ['semantic']);
  assert.equal(payload.visibility, 'private');
  assert.equal(payload.source_uri, 'file://docs/architecture/subsystems.md');
  assert.ok(payload.tags.includes('connector:openclaw'));
  assert.deepEqual(payload.metadata.imbas_links, ['artifact://demo']);
});

test('redacts Sanctum handles and raw secret-like values before Memsocket payloads', () => {
  const payload = imbasEventToMemsocketPayload({
    connector: 'OpenClaw',
    agent: 'main',
    type: 'secret_access',
    layer: 'episodic',
    visibility: 'secret_pointer',
    text: 'Used secret://github/token with token=FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456.'
  });

  assert.equal(payload.text.includes('secret://github/token'), false);
  assert.equal(payload.text.includes('FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456'), false);
  assert.match(payload.text, /\[secret-handle:redacted\]/);
  assert.match(payload.text, /\[raw-secret:redacted\]/);
});

test('rejects invalid secret pointer events before mapping', () => {
  assert.throws(() => imbasEventToMemsocketPayload({
    connector: 'OpenClaw',
    agent: 'main',
    type: 'secret_access',
    layer: 'episodic',
    visibility: 'secret_pointer',
    text: 'Used the GitHub token directly.'
  }), /Sanctum handle/);
});
