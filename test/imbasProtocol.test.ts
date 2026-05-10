import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeConnectorName, validateContextEventDraft } from '../src/shared/imbas/protocol.ts';

test('normalizes connector names for stable Conduit identifiers', () => {
  assert.equal(normalizeConnectorName(' Claude Code '), 'claude-code');
  assert.equal(normalizeConnectorName('OpenClaw/Mattermost'), 'openclaw-mattermost');
});

test('validates minimal context event drafts', () => {
  const errors = validateContextEventDraft({
    connector: 'OpenClaw',
    agent: 'main',
    type: 'decision',
    layer: 'semantic',
    visibility: 'private',
    text: 'Use Imbas OS as the umbrella product name.'
  });
  assert.deepEqual(errors, []);
});

test('secret pointer events must reference Sanctum handles', () => {
  const errors = validateContextEventDraft({
    connector: 'OpenClaw',
    agent: 'main',
    type: 'secret_access',
    layer: 'episodic',
    visibility: 'secret_pointer',
    text: 'Used the GitHub token.'
  });
  assert.ok(errors.some((error) => error.includes('Sanctum handle')));
});
