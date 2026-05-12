import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSensitiveHandles, isCapabilityHandle, isSecretHandle, redactSensitiveText } from '../src/main/sanctum/secretHandles.ts';

test('validates Sanctum secret and capability handles', () => {
  assert.equal(isSecretHandle('secret://github/personal-access-token'), true);
  assert.equal(isCapabilityHandle('capability://github/create-private-repo'), true);
  assert.equal(isSecretHandle('https://example.com'), false);
});

test('extracts unique sensitive handles for audit references', () => {
  const handles = extractSensitiveHandles('Use secret://github/token and capability://b2/write-backup then secret://github/token again.');
  assert.deepEqual(handles, ['capability://b2/write-backup', 'secret://github/token']);
});

test('redacts handles and common raw secret-like values', () => {
  const text = 'token=FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456 and secret://github/token with api_key=supersecretvalue';
  const redacted = redactSensitiveText(text);
  assert.equal(redacted.includes('FAKE_TEST_TOKEN_abcdefghijklmnopqrstuvwxyz123456'), false);
  assert.equal(redacted.includes('supersecretvalue'), false);
  assert.equal(redacted.includes('secret://github/token'), false);
  assert.match(redacted, /\[secret-handle:redacted\]/);
  assert.match(redacted, /\[raw-secret:redacted\]/);
});
