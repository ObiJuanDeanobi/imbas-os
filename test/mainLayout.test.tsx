import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
// @ts-ignore - we just need to test layout, we can mock the import or App
import { App } from '../src/renderer/main.tsx';

test('App layout structure includes Right Inspector', () => {
  // Mock window.artifactVault before rendering App
  (global as any).window = {
    artifactVault: {
      vaultInfo: async () => ({ root: '/mock/root', artifactCount: 0 }),
      listArtifacts: async () => [],
      artifactGraph: async () => ({ nodes: [], edges: [] }),
      syncStatus: async () => null,
      conduitStatus: async () => null,
    }
  };

  try {
    const html = renderToString(<App />);
    assert.ok(html.includes('class="inspector-pane"'), 'Right inspector pane should exist in the layout');
  } catch (error: any) {
    console.warn("Render threw an error, but we expect it might without full DOM:", error);
    throw error;
  }
});

test('App center workspace renders primary actions', () => {
  // We need to render the App with an artifact selected to see the center workspace
  (global as any).window = {
    artifactVault: {
      vaultInfo: async () => ({ root: '/mock/root', artifactCount: 1 }),
      listArtifacts: async () => [{ id: 'art-1', title: 'Test Artifact', kind: 'artifact', tags: [] }],
      searchUnified: async () => [{ id: 'art-1', title: 'Test Artifact', kind: 'artifact', tags: [] }],
      readArtifact: async () => ({ metadata: { title: 'Test Artifact', tags: [], trustLevel: 'untrusted' }, notes: '' }),
      listSnapshots: async () => [],
      artifactGraph: async () => ({ nodes: [{ id: 'art-1', kind: 'artifact' }], edges: [] }),
      syncStatus: async () => null,
      conduitStatus: async () => null,
    }
  };

  const html = renderToString(<App />);
  assert.ok(html.includes('>Export<'), 'Center workspace should have Export button');
  assert.ok(html.includes('>Copy AI context<'), 'Center workspace should have Copy AI context button');
});
