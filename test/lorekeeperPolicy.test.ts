import { test } from 'node:test';
import * as assert from 'node:assert';
import { evaluateLorekeeperPolicy } from '../src/main/lorekeeper/policy.js';

test('Lorekeeper policy correctly flags a proposal as auto-apply when it meets all safety rules', () => {
  const proposal = {
    title: 'Test Proposal',
    markdown: 'This is a short safe note.',
    rationale: 'Testing policy',
    connector: 'system',
    agent: 'test_agent',
    targetPageId: 'wiki/safe-page',
    sources: ['source1']
  };

  const result = evaluateLorekeeperPolicy(proposal);
  assert.strictEqual(result.action, 'auto-apply');
  assert.strictEqual(result.reason, 'Meets all low-risk managed block criteria.');
});

test('Lorekeeper policy requires review if there are no sources', () => {
  const proposal = { title: 'T', markdown: 'M', rationale: 'R', connector: 'C', agent: 'A', targetPageId: 'wiki/safe', sources: [] };
  const result = evaluateLorekeeperPolicy(proposal);
  assert.strictEqual(result.action, 'review-required');
  assert.strictEqual(result.reason, 'Proposal must include at least one source citation.');
});

test('Lorekeeper policy requires review if markdown exceeds 2000 characters', () => {
  const proposal = { title: 'T', markdown: 'M'.repeat(2001), rationale: 'R', connector: 'C', agent: 'A', targetPageId: 'wiki/safe', sources: ['s1'] };
  const result = evaluateLorekeeperPolicy(proposal);
  assert.strictEqual(result.action, 'review-required');
  assert.strictEqual(result.reason, 'Markdown content exceeds 2000 character limit.');
});

test('Lorekeeper policy requires review if target page is outside safe zones', () => {
  const proposal = { title: 'T', markdown: 'M', rationale: 'R', connector: 'C', agent: 'A', targetPageId: 'system/config', sources: ['s1'] };
  const result = evaluateLorekeeperPolicy(proposal);
  assert.strictEqual(result.action, 'review-required');
  assert.strictEqual(result.reason, 'Target page is outside safe zones (must start with wiki/ or notes/).');
});

test('Lorekeeper policy requires review if it contains redacted Sanctum secrets', () => {
  const proposal = { title: 'T', markdown: 'This has [REDACTED_SECRET:foo] inside.', rationale: 'R', connector: 'C', agent: 'A', targetPageId: 'wiki/safe', sources: ['s1'] };
  const result = evaluateLorekeeperPolicy(proposal);
  assert.strictEqual(result.action, 'review-required');
  assert.strictEqual(result.reason, 'Content contains redacted Sanctum secrets.');
});

