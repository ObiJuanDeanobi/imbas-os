import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { App } from '../src/renderer/main.tsx';

test('Import panel shows a Destination Project selector', () => {
  (global as any).window = {
    artifactVault: {
      vaultInfo: async () => ({ root: '/mock/root', artifactCount: 0 }),
      listArtifacts: async () => [],
      artifactGraph: async () => ({ nodes: [], edges: [] }),
      syncStatus: async () => null,
      conduitStatus: async () => null,
    }
  };

  const html = renderToString(<App />);
  assert.ok(html.includes('Destination project'), 'Import panel should have a label for selecting the destination project');
  assert.ok(html.includes('id="destination-project"'), 'Import panel should have a select element for the destination project');
});
