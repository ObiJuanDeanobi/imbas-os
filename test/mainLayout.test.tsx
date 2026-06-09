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
    // If renderToString throws because of other missing globals or hooks,
    // we might need a simpler mock, but this tests the structural intent.
    console.warn("Render threw an error, but we expect it might without full DOM:", error);
    throw error;
  }
});
