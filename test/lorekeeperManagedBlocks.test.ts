import assert from 'node:assert/strict';
import test from 'node:test';
import { applyLorekeeperProposalToMarkdown, createLorekeeperProposal, transitionLorekeeperProposal } from '../src/main/lorekeeper/proposals.ts';

test('Lorekeeper applies approved proposals only inside managed blocks with citations', () => {
  const proposal = transitionLorekeeperProposal(createLorekeeperProposal({
    title: 'Sprint 6 note',
    markdown: 'Sprint 6 adds guarded managed block apply.',
    rationale: 'Promote verified durable knowledge.',
    connector: 'OpenClaw',
    agent: 'main',
    targetPageId: 'wiki:pages/imbas-os.md',
    sources: ['openclaw://runs/sprint-6']
  }), 'approved');
  const original = '# Imbas OS\n\nHuman notes stay above.\n';
  const applied = applyLorekeeperProposalToMarkdown(original, proposal);
  assert.match(applied.markdown, /<!-- IMBAS:LOREKEEPER:BEGIN sprint-6-note -->/);
  assert.match(applied.markdown, /Sprint 6 adds guarded managed block apply\./);
  assert.match(applied.markdown, /Sources: openclaw:\/\/runs\/sprint-6/);
  assert.match(applied.markdown, /Human notes stay above\./);
  assert.equal(applied.changed, true);
});

test('Lorekeeper refuses unapproved or unsourced managed block apply', () => {
  const proposal = createLorekeeperProposal({ title: 'Nope', markdown: 'Nope', rationale: 'Nope', connector: 'OpenClaw', agent: 'main', targetPageId: 'wiki:pages/nope.md' });
  assert.throws(() => applyLorekeeperProposalToMarkdown('# Nope\n', proposal), /approved/);
  const approved = transitionLorekeeperProposal(proposal, 'approved');
  assert.throws(() => applyLorekeeperProposalToMarkdown('# Nope\n', approved), /source/);
});
