import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { resolveOpenClawCommand } from '../src/main/openclaw/dispatcher.ts';

test('OpenClaw dispatcher resolves absolute CLI path for GUI environments with sparse PATH', () => {
  const resolved = resolveOpenClawCommand({ PATH: '/usr/bin:/bin' });
  const userInstall = join(homedir(), '.npm-global/bin/openclaw');
  if (existsSync(userInstall)) {
    assert.equal(resolved, userInstall);
  } else {
    assert.equal(resolved, 'openclaw');
  }
});

test('OpenClaw dispatcher allows explicit command override', () => {
  assert.equal(resolveOpenClawCommand({ IMBAS_OS_OPENCLAW_COMMAND: '/tmp/fake-openclaw' }), '/tmp/fake-openclaw');
});
