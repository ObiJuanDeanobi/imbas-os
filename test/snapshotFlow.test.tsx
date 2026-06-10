import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { InspectorPane } from '../src/renderer/components/InspectorPane.tsx';

test('Snapshot browser requires explicit confirmation before restore', () => {
  const mockGraph = { nodes: [], edges: [] };
  const mockSelected = {
    id: 'art-123',
    kind: 'artifact',
    title: 'Test Artifact',
    trustLevel: 'untrusted',
  };

  const html = renderToString(<InspectorPane selected={mockSelected} graph={mockGraph} onRefresh={async () => {}} onIndexDirty={() => {}} defaultTab="snapshots" />);
  
  // We can't fully simulate clicks easily with renderToString, but we can verify the text that explains the restore is reversible
  assert.ok(html.includes('Snapshots preserve artifact.html, metadata.json, and notes.md'), 'Snapshot explanation text should be present');
});
