import type { TrustLevel } from '../../shared/types.js';

export type ArtifactRenderPolicy = {
  trustLevel: TrustLevel;
  sandbox: string;
  csp: string;
  networkAllowed: boolean;
};

export function renderPolicyForTrustLevel(trustLevel: TrustLevel): ArtifactRenderPolicy {
  if (trustLevel === 'trusted') {
    return {
      trustLevel,
      sandbox: 'allow-scripts',
      csp: "default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      networkAllowed: false
    };
  }

  return {
    trustLevel,
    sandbox: 'allow-scripts',
    csp: "default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    networkAllowed: false
  };
}

export function shouldBlockArtifactRequest(url: string, networkAllowed = false) {
  if (networkAllowed) return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function wrapHtmlForSandbox(html: string, policy: ArtifactRenderPolicy) {
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(policy.csp)}">`;
  const withoutExistingCsp = stripExistingCspMeta(html);
  if (/<head[^>]*>/i.test(withoutExistingCsp)) return withoutExistingCsp.replace(/<head([^>]*)>/i, `<head$1>${cspMeta}`);
  if (/<html[^>]*>/i.test(withoutExistingCsp)) return withoutExistingCsp.replace(/<html([^>]*)>/i, `<html$1><head>${cspMeta}</head>`);
  return `<!doctype html><html><head>${cspMeta}</head><body>${withoutExistingCsp}</body></html>`;
}

function stripExistingCspMeta(html: string) {
  return html.replace(/<meta\b(?=[^>]*http-equiv=["']?Content-Security-Policy["']?)[^>]*>/gi, '');
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
