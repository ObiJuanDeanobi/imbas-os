import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDurableConduitRecordStore } from '../src/main/conduit/durableStore.ts';
import { createConduitRecordStore, handleConduitRequest } from '../src/main/conduit/localApi.ts';

test('Conduit records runs into Runledger timeline', async () => {
  const store = createConduitRecordStore();
  await handleConduitRequest(new Request('http://127.0.0.1/v0/runs', {
    method: 'POST',
    body: JSON.stringify({ connector: 'OpenClaw', agent: 'main', runId: 'run-4', task: 'Sprint 4', outcome: 'completed', summary: 'Added Runledger.' })
  }), store);
  const response = await handleConduitRequest(new Request('http://127.0.0.1/v0/runledger?query=Runledger'), store);
  assert.equal(response.status, 200);
  const body = response.body as { entries: { kind: string; title: string }[] };
  assert.equal(body.entries.length, 1);
  assert.equal(body.entries[0].kind, 'run');
});

test('Conduit accepts Lorekeeper wiki proposals without mutating wiki pages', async () => {
  const store = createConduitRecordStore();
  const response = await handleConduitRequest(new Request('http://127.0.0.1/v0/wiki/proposals', {
    method: 'POST',
    body: JSON.stringify({ title: 'Sprint 4 note', markdown: '# Sprint 4\n\nRunledger + Lorekeeper.', rationale: 'Promote durable project knowledge.', connector: 'OpenClaw', agent: 'main', sources: ['openclaw://runs/run-4'] })
  }), store);
  assert.equal(response.status, 202);
  assert.equal(store.lorekeeperProposals.length, 1);
  assert.equal(store.runledger.length, 1);

  const list = await handleConduitRequest(new Request('http://127.0.0.1/v0/wiki/proposals?query=Sprint%204'), store);
  assert.equal((list.body as { proposals: unknown[] }).proposals.length, 1);
});

test('durable Conduit store reloads Runledger and Lorekeeper proposal state', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'imbas-lorekeeper-'));
  const store = await createDurableConduitRecordStore({ dir });
  await handleConduitRequest(new Request('http://127.0.0.1/v0/wiki/proposals', {
    method: 'POST',
    body: JSON.stringify({ title: 'Persisted note', markdown: '# Persisted', rationale: 'Test durable proposal', connector: 'OpenClaw', agent: 'main' })
  }), store);
  const reloaded = await createDurableConduitRecordStore({ dir });
  assert.equal(reloaded.lorekeeperProposals.length, 1);
  assert.equal(reloaded.runledger.length, 1);
});


test('Conduit previews Lorekeeper apply with before and after markdown without mutating page', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imbas-lorekeeper-preview-'));
  const { createMarkdownPage, readMarkdownPageFromVault } = await import('../src/main/markdown/markdownStore.ts');
  const page = await createMarkdownPage(root, { title: 'Preview Page', markdown: '# Preview Page\n\nHuman-owned intro.\n' });
  const store = createConduitRecordStore();
  store.markdownRoot = root;

  const proposalResponse = await handleConduitRequest(new Request('http://127.0.0.1/v0/wiki/proposals', {
    method: 'POST',
    body: JSON.stringify({ title: 'Preview block', markdown: 'Previewed block content.', rationale: 'Show diff before apply.', connector: 'OpenClaw', agent: 'main', targetPageId: page.node.id, sources: ['openclaw://runs/preview'] })
  }), store);
  const proposal = (proposalResponse.body as { proposal: { id: string } }).proposal;
  const previewResponse = await handleConduitRequest(new Request(`http://127.0.0.1/v0/wiki/proposals/${proposal.id}/preview`, { method: 'POST' }), store);
  assert.equal(previewResponse.status, 200);
  const preview = previewResponse.body as { before: string; after: string; changed: boolean };
  assert.equal(preview.changed, true);
  assert.match(preview.before, /Human-owned intro\./);
  assert.match(preview.after, /Previewed block content\./);
  const unchanged = await readMarkdownPageFromVault(root, page.node.id);
  assert.doesNotMatch(unchanged.markdown, /Previewed block content\./);
});

test('Conduit applies approved Lorekeeper proposal to managed block and records Runledger audit', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imbas-lorekeeper-apply-'));
  const { createMarkdownPage, readMarkdownPageFromVault } = await import('../src/main/markdown/markdownStore.ts');
  const page = await createMarkdownPage(root, { title: 'Imbas OS', markdown: '# Imbas OS\n\nHuman-owned intro.\n' });
  const store = createConduitRecordStore();
  store.markdownRoot = root;

  const proposalResponse = await handleConduitRequest(new Request('http://127.0.0.1/v0/wiki/proposals', {
    method: 'POST',
    body: JSON.stringify({ title: 'Sprint 6 apply', markdown: 'Managed block apply is guarded.', rationale: 'Close Lorekeeper loop.', connector: 'OpenClaw', agent: 'main', targetPageId: page.node.id, sources: ['openclaw://runs/sprint-6'] })
  }), store);
  const proposal = (proposalResponse.body as { proposal: { id: string } }).proposal;
  await handleConduitRequest(new Request(`http://127.0.0.1/v0/wiki/proposals/${proposal.id}/approve`, { method: 'POST' }), store);
  const applyResponse = await handleConduitRequest(new Request(`http://127.0.0.1/v0/wiki/proposals/${proposal.id}/apply`, { method: 'POST' }), store);
  assert.equal(applyResponse.status, 200);
  const applyBody = applyResponse.body as { snapshot?: { snapshotPath?: string; markdown?: string } };
  assert.match(applyBody.snapshot?.snapshotPath ?? '', /^\.snapshots\/pages\/imbas-os\//);
  const snapshotMarkdown = await readFile(path.join(root, applyBody.snapshot?.snapshotPath ?? ''), 'utf8');
  assert.match(snapshotMarkdown, /Human-owned intro\./);
  assert.doesNotMatch(snapshotMarkdown, /Managed block apply is guarded\./);
  const snapshotsResponse = await handleConduitRequest(new Request(`http://127.0.0.1/v0/wiki/snapshots?targetPageId=${encodeURIComponent(page.node.id)}`), store);
  assert.equal(snapshotsResponse.status, 200);
  const snapshots = (snapshotsResponse.body as { snapshots: { snapshotPath: string }[] }).snapshots;
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].snapshotPath, applyBody.snapshot?.snapshotPath);
  const snapshotPreviewResponse = await handleConduitRequest(new Request(`http://127.0.0.1/v0/wiki/snapshots/preview?targetPageId=${encodeURIComponent(page.node.id)}&snapshotPath=${encodeURIComponent(snapshots[0].snapshotPath)}`), store);
  assert.equal(snapshotPreviewResponse.status, 200);
  const snapshotPreview = snapshotPreviewResponse.body as { snapshot: { markdown: string } };
  assert.match(snapshotPreview.snapshot.markdown, /Human-owned intro\./);
  assert.doesNotMatch(snapshotPreview.snapshot.markdown, /Managed block apply is guarded\./);
  const updated = await readMarkdownPageFromVault(root, page.node.id);
  assert.match(updated.markdown, /Human-owned intro\./);
  assert.match(updated.markdown, /<!-- IMBAS:LOREKEEPER:BEGIN sprint-6-apply -->/);
  assert.match(updated.markdown, /Managed block apply is guarded\./);
  assert.equal(store.lorekeeperProposals.find((item) => item.id === proposal.id)?.status, 'applied');
  assert.equal(store.runledger.some((entry) => entry.kind === 'lorekeeper' && entry.outcome === 'applied'), true);
});
