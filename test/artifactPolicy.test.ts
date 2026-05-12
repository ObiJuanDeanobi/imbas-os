import assert from 'node:assert/strict';
import test from 'node:test';
import { renderPolicyForTrustLevel, shouldBlockArtifactRequest, wrapHtmlForSandbox } from '../src/main/security/artifactPolicy.ts';

test('untrusted render policy denies network and same-origin privileges', () => {
  const policy = renderPolicyForTrustLevel('untrusted');
  assert.equal(policy.networkAllowed, false);
  assert.equal(policy.sandbox, 'allow-scripts');
  assert.doesNotMatch(policy.sandbox, /allow-same-origin/);
  assert.match(policy.csp, /default-src 'none'/);
  assert.match(policy.csp, /connect-src 'none'/);
});

test('artifact network blocker cancels remote requests by default', () => {
  assert.equal(shouldBlockArtifactRequest('https://example.com/steal'), true);
  assert.equal(shouldBlockArtifactRequest('http://example.com/steal'), true);
  assert.equal(shouldBlockArtifactRequest('wss://example.com/socket'), true);
  assert.equal(shouldBlockArtifactRequest('data:text/plain,ok'), false);
  assert.equal(shouldBlockArtifactRequest('https://example.com/allowed', true), false);
});

test('wrapHtmlForSandbox injects CSP into existing head', () => {
  const policy = renderPolicyForTrustLevel('untrusted');
  const wrapped = wrapHtmlForSandbox('<!doctype html><html><head><title>x</title></head><body></body></html>', policy);
  assert.match(wrapped, /Content-Security-Policy/);
  assert.match(wrapped, /connect-src 'none'/);
});

test('wrapHtmlForSandbox replaces existing CSP meta tags', () => {
  const policy = renderPolicyForTrustLevel('untrusted');
  const wrapped = wrapHtmlForSandbox('<html><head><meta http-equiv="Content-Security-Policy" content="default-src *"><title>x</title></head><body></body></html>', policy);
  assert.equal((wrapped.match(/Content-Security-Policy/g) ?? []).length, 1);
  assert.doesNotMatch(wrapped, /default-src \*/);
  assert.match(wrapped, /default-src 'none'/);
});
