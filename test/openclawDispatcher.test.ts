import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { resolveOpenClawCommand } from '../src/main/openclaw/dispatcher.ts';

test('OpenClaw dispatcher resolves absolute CLI path for GUI environments with sparse PATH', () => {
  const resolved = resolveOpenClawCommand({ PATH: '/usr/bin:/bin' });
  if (existsSync('/home/ubuntu/.npm-global/bin/openclaw')) {
    assert.equal(resolved, '/home/ubuntu/.npm-global/bin/openclaw');
  } else {
    assert.equal(resolved, 'openclaw');
  }
});

test('OpenClaw dispatcher allows explicit command override', () => {
  assert.equal(resolveOpenClawCommand({ IMBAS_OS_OPENCLAW_COMMAND: '/tmp/fake-openclaw' }), '/tmp/fake-openclaw');
});
