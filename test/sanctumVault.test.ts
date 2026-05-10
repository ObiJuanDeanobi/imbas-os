import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSanctumVault } from '../src/main/sanctum/vault.ts';

test('Sanctum vault stores encrypted secret values and reloads metadata by handle', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sanctum-vault-'));
  const vault = await createSanctumVault({ file: path.join(dir, 'vault.json'), passphrase: 'test-passphrase' });
  await vault.putSecret({
    handle: 'secret://github/token',
    value: 'ghp_abcdefghijklmnopqrstuvwxyz123456',
    label: 'GitHub token',
    allowedConnectors: ['OpenClaw'],
    allowedTools: ['github'],
    approval: 'per_use'
  });

  const rawFile = await readFile(path.join(dir, 'vault.json'), 'utf8');
  assert.equal(rawFile.includes('ghp_abcdefghijklmnopqrstuvwxyz123456'), false);
  assert.equal(rawFile.includes('GitHub token'), true);

  const reloaded = await createSanctumVault({ file: path.join(dir, 'vault.json'), passphrase: 'test-passphrase' });
  assert.deepEqual((await reloaded.listSecrets()).map((secret) => secret.handle), ['secret://github/token']);
  assert.equal(await reloaded.resolveSecret('secret://github/token', { connector: 'OpenClaw', tool: 'github', purpose: 'private repo creation', approved: true }), 'ghp_abcdefghijklmnopqrstuvwxyz123456');
});

test('Sanctum vault denies unapproved or out-of-policy secret resolution and audits attempts', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sanctum-vault-policy-'));
  const vault = await createSanctumVault({ file: path.join(dir, 'vault.json'), passphrase: 'test-passphrase' });
  await vault.putSecret({ handle: 'secret://b2/key', value: 'b2-secret-value', allowedConnectors: ['OpenClaw'], allowedTools: ['backup'], approval: 'per_use' });

  await assert.rejects(() => vault.resolveSecret('secret://b2/key', { connector: 'OpenClaw', tool: 'backup', purpose: 'backup', approved: false }), /approval required/);
  await assert.rejects(() => vault.resolveSecret('secret://b2/key', { connector: 'Hermes', tool: 'backup', purpose: 'backup', approved: true }), /connector not allowed/);

  const audit = await vault.readAuditLog();
  assert.equal(audit.length, 2);
  assert.equal(audit.every((entry) => entry.handle === 'secret://b2/key'), true);
  assert.equal(audit.some((entry) => entry.decision === 'denied'), true);
  assert.equal(JSON.stringify(audit).includes('b2-secret-value'), false);
});
