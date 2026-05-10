export type SecretHandle = `secret://${string}`;
export type CapabilityHandle = `capability://${string}`;
export type SensitiveHandle = SecretHandle | CapabilityHandle;

const SECRET_HANDLE_PATTERN = /\bsecret:\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+/g;
const CAPABILITY_HANDLE_PATTERN = /\bcapability:\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+/g;

const RAW_SECRET_PATTERNS: RegExp[] = [
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/g,
  /\bsk-[A-Za-z0-9]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(?:password|passwd|api[_-]?key|token|secret)\s*[:=]\s*([^\s'\"]{8,})/gi
];

export function isSecretHandle(value: string): value is SecretHandle {
  return /^secret:\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+$/.test(value);
}

export function isCapabilityHandle(value: string): value is CapabilityHandle {
  return /^capability:\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+$/.test(value);
}

export function isSensitiveHandle(value: string): value is SensitiveHandle {
  return isSecretHandle(value) || isCapabilityHandle(value);
}

export function extractSensitiveHandles(text: string): SensitiveHandle[] {
  const handles = new Set<SensitiveHandle>();
  for (const match of text.matchAll(SECRET_HANDLE_PATTERN)) handles.add(match[0] as SecretHandle);
  for (const match of text.matchAll(CAPABILITY_HANDLE_PATTERN)) handles.add(match[0] as CapabilityHandle);
  return [...handles].sort();
}

export function redactSensitiveText(text: string): string {
  let redacted = text
    .replace(SECRET_HANDLE_PATTERN, '[secret-handle:redacted]')
    .replace(CAPABILITY_HANDLE_PATTERN, '[capability-handle:redacted]');

  for (const pattern of RAW_SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (match, captured) => {
      if (typeof captured === 'string' && captured.length > 0) {
        return match.replace(captured, '[raw-secret:redacted]');
      }
      return '[raw-secret:redacted]';
    });
  }

  return redacted;
}

export function assertNoRawSecretLeak(text: string): void {
  const redacted = redactSensitiveText(text);
  if (redacted !== text && !extractSensitiveHandles(text).length) {
    throw new Error('raw secret-like content detected; use a Sanctum secret handle or capability instead');
  }
}
