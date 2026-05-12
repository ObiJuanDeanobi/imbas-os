import assert from 'node:assert/strict';
import test from 'node:test';
import { createLorekeeperProposal, searchLorekeeperProposals, transitionLorekeeperProposal } from '../src/main/lorekeeper/proposals.ts';
import { createRunledgerEntry, searchRunledger } from '../src/main/runledger/store.ts';

test('Runledger entries are durable timeline records with searchable summaries', () => {
  const entry = createRunledgerEntry({ kind: 'run', connector: 'OpenClaw', agent: 'main', title: 'Sprint 4', outcome: 'completed', summary: 'Added Lorekeeper proposal workflow.' });
  assert.match(entry.id, /^runledger_/);
  assert.equal(searchRunledger([entry], 'Lorekeeper').length, 1);
});

test('Lorekeeper proposals redact sensitive content and require explicit status transitions', () => {
  const proposal = createLorekeeperProposal({
    title: 'Sprint 4 note',
    markdown: '# Note\n\ntoken=FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456',
    rationale: 'Promote sprint decision into wiki.',
    connector: 'OpenClaw',
    agent: 'main',
    sources: ['openclaw://runs/run-1']
  });
  assert.equal(proposal.status, 'proposed');
  assert.equal(proposal.markdown.includes('FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456'), false);
  assert.equal(searchLorekeeperProposals([proposal], 'Sprint 4').length, 1);
  assert.equal(transitionLorekeeperProposal(proposal, 'approved').status, 'approved');
});
