import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { InspectorPane } from '../src/renderer/components/InspectorPane.tsx';

test('InspectorPane has an AI Context export tab', () => {
  const mockGraph = { nodes: [], edges: [] };
  const mockSelected = {
    id: 'art-123',
    kind: 'artifact',
    title: 'Test Artifact',
    trustLevel: 'untrusted',
  };

  const html = renderToString(<InspectorPane selected={mockSelected} graph={mockGraph} onRefresh={async () => {}} onIndexDirty={() => {}} defaultTab="export" />);
  
  assert.ok(html.includes('AI Context'), 'The tab list should include an AI Context or Export tab');
  assert.ok(html.includes('Copy AI context'), 'There should be a button to copy AI context');
});
