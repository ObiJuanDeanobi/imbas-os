import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { seedDemoVault } from '../src/main/demo/demoVault.ts';

test('seedDemoVault creates a complete seven-artifact product tour', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  try {
    const artifacts = await seedDemoVault(root);
    const demoArtifacts = artifacts.filter((artifact) => artifact.tags.includes('demo-pack'));
    assert.equal(demoArtifacts.length, 7);
    assert.deepEqual(new Set(demoArtifacts.map((artifact) => artifact.project)), new Set(['Demo Vault']));
    assert.ok(demoArtifacts.some((artifact) => artifact.title === 'Imbas Artifact Workbench Architecture Map'));
    assert.ok(demoArtifacts.some((artifact) => artifact.title === 'Throwaway Brief Editor'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
