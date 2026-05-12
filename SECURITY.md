# Security policy

Imbas OS is in public alpha. The first supported public surface is **Imbas Artifact Vault**: a local-first desktop vault for AI-generated HTML artifacts.

Generated HTML is active content. Treating those artifacts as hostile documents is part of the product, not an afterthought.

## Supported versions

Security support currently applies to the `main` branch and the latest public prerelease.

After stable releases begin, this page will list supported release lines.

## Reporting a vulnerability

Please **do not open a public issue with exploit details**.

Preferred private reporting path:

1. Use GitHub private vulnerability reporting / Security Advisory flow if available.
2. Include reproduction steps, affected commit/version, platform, and impact.
3. If the issue involves generated HTML sandboxing, include the smallest safe HTML proof of concept.

If GitHub private reporting is not available yet, open a minimal public issue saying you have a security report, without exploit details, and a maintainer will arrange a private channel.

## Security model highlights

Artifact Vault treats imported/generated HTML as untrusted by default:

- artifact replay uses a constrained `artifact://` scheme;
- the custom protocol is registered as a secure standard scheme before Electron app ready;
- renderer security disables Node integration and uses context isolation and sandboxing;
- generated artifacts are wrapped with a restrictive CSP;
- artifact-origin network requests are blocked by default;
- artifact permission requests, popup windows, and artifact-initiated top-level navigation are denied;
- imported artifacts start as `untrusted` and trust is local;
- private data, secrets, tokens, and raw credentials should not be stored in artifacts, wiki pages, Runledger entries, context packs, or public fixtures.

See also:

- [`docs/threat-model.md`](docs/threat-model.md)
- [`docs/file-format.md`](docs/file-format.md)
- [`docs/ops/verification.md`](docs/ops/verification.md)

## What to report

Please report:

- generated HTML escaping the sandbox;
- artifact-origin network access that should be blocked;
- Node/Electron bridge access from untrusted content;
- artifact popups, permission prompts, or top-level navigation that should be denied;
- path traversal or unsafe file writes/reads;
- secret/token leakage into logs, artifacts, wiki, context packs, or Runledger;
- bypasses of Lorekeeper approval/managed-block boundaries;
- bypasses of Sanctum redaction, capability, or secret-handle boundaries.

## What not to report

Please do not report:

- social engineering against maintainers;
- denial-of-service issues requiring unrealistic local access or huge local files without a concrete exploit path;
- issues in intentionally private-preview/experimental features unless they cross a documented security boundary.

## Response expectations

This is a small early project. We will acknowledge credible private reports as soon as practical, prioritize sandbox/secret/data-loss issues, and coordinate fixes before public disclosure when appropriate.

There is currently no bug bounty program.
