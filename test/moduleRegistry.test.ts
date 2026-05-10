import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultModuleRegistry, listEnabledModules } from '../src/shared/imbas/modules.ts';

test('default module registry exposes user-selectable Imbas modules', () => {
  const registry = createDefaultModuleRegistry();
  assert.equal(registry.conduit.enabled, true);
  assert.equal(registry.memsocket.enabled, false);
  assert.equal(registry.memsocket.health, 'not_configured');
  assert.ok(registry.memsocket.capabilities.includes('context.packs'));
  assert.ok(listEnabledModules(registry).some((module) => module.id === 'artifact-vault'));
});

test('module registry supports runtime module status overrides', () => {
  const registry = createDefaultModuleRegistry({
    memsocket: { enabled: true, available: true, configured: true, health: 'ok' }
  });
  assert.equal(registry.memsocket.enabled, true);
  assert.equal(registry.memsocket.health, 'ok');
});
