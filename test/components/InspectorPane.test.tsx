import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { InspectorPane } from '../../src/renderer/components/InspectorPane';

test('InspectorPane shows empty state when nothing is selected', () => {
  const html = renderToString(<InspectorPane selected={null} graph={{ nodes: [], edges: [] }} onRefresh={async () => {}} onIndexDirty={() => {}} />);
  assert.ok(html.includes('Select an item to view details'), 'Should show empty state');
});

test('InspectorPane displays artifact title when artifact is selected', () => {
  (global as any).window = {
    artifactVault: {
      readArtifact: async () => ({ metadata: { title: 'Test Artifact', tags: [], trustLevel: 'untrusted' }, notes: '' }),
      listSnapshots: async () => []
    }
  };

  const artifact = {
    id: 'art-123',
    title: 'Test Artifact',
    kind: 'artifact',
    trustLevel: 'untrusted',
    tags: [],
    project: 'test-project',
    snapshotCount: 0,
    model: '',
    provider: '',
    prompt: '',
    sourceType: 'paste'
  };
  
  const graph = { nodes: [], edges: [] };
  const onRefresh = async () => {};
  const onIndexDirty = () => {};

  const html = renderToString(<InspectorPane selected={artifact} graph={graph} onRefresh={onRefresh} onIndexDirty={onIndexDirty} />);
  assert.ok(html.includes('Test Artifact'), 'Should display artifact title');
  assert.ok(html.includes('untrusted'), 'Should display trust level');
  
  // Test tabs
  assert.ok(html.includes('Details'), 'Should render Details tab');
  assert.ok(html.includes('Notes'), 'Should render Notes tab');
  assert.ok(html.includes('Provenance'), 'Should render Provenance tab');

  // Test Details view content
  assert.ok(html.includes('value="Test Artifact"'), 'Should render title input');
  assert.ok(html.includes('value="untrusted"'), 'Should render trust level select');
  assert.ok(html.includes('Save metadata'), 'Should render save metadata button');
});

test('InspectorPane displays wiki details when wiki node is selected', () => {
  const wikiNode = {
    id: 'wiki:test',
    kind: 'wiki',
    title: 'Test Wiki Page',
    path: 'test.md',
    relativePath: 'test.md',
    sourceOwnership: 'vault-owned',
    tags: [],
    wikilinks: [],
    artifactLinks: []
  };
  
  const html = renderToString(<InspectorPane selected={wikiNode} graph={{ nodes: [], edges: [] }} onRefresh={async () => {}} onIndexDirty={() => {}} />);
  assert.ok(html.includes('Test Wiki Page'), 'Should display wiki title');
  assert.ok(html.includes('Source ownership'), 'Should display source ownership section');
});

test('InspectorPane displays notes textarea when Notes tab is selected', () => {
  const artifact = {
    id: 'art-123',
    title: 'Test Artifact',
    kind: 'artifact',
    trustLevel: 'untrusted',
  };
  
  // We pass defaultTab to test the rendered output of other tabs
  const html = renderToString(<InspectorPane selected={artifact} defaultTab="notes" graph={{ nodes: [], edges: [] }} onRefresh={async () => {}} onIndexDirty={() => {}} />);
  assert.ok(html.includes('Sidecar notes'), 'Should render notes description');
  assert.ok(html.includes('Save notes.md'), 'Should render save button');
});

test('InspectorPane displays provenance data when Provenance tab is selected', () => {
  const artifact = {
    id: 'art-123',
    title: 'Test Artifact',
    kind: 'artifact',
    trustLevel: 'untrusted',
    prompt: 'Create a test',
    model: 'gpt-test',
    provider: 'openai'
  };
  const html = renderToString(<InspectorPane selected={artifact} defaultTab="provenance" graph={{ nodes: [], edges: [] }} onRefresh={async () => {}} onIndexDirty={() => {}} />);
  assert.ok(html.includes('gpt-test'), 'Should display model');
  assert.ok(html.includes('openai'), 'Should display provider');
  assert.ok(html.includes('Create a test'), 'Should display prompt');
});

test('InspectorPane displays snapshot options when Snapshots tab is selected', () => {
  const artifact = { id: 'art-123', kind: 'artifact' };
  const html = renderToString(<InspectorPane selected={artifact} defaultTab="snapshots" graph={{ nodes: [], edges: [] }} onRefresh={async () => {}} onIndexDirty={() => {}} />);
  assert.ok(html.includes('Snapshots preserve'), 'Should display snapshots description');
  assert.ok(html.includes('Create snapshot'), 'Should display snapshot button');
});

test('InspectorPane does not display Export tab', () => {
  const artifact = { id: 'art-123', kind: 'artifact' };
  const html = renderToString(<InspectorPane selected={artifact} defaultTab="details" graph={{ nodes: [], edges: [] }} onRefresh={async () => {}} onIndexDirty={() => {}} />);
  assert.ok(!html.includes('>Export<'), 'Should not display Export tab');
});
