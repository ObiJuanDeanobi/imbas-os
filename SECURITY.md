# Security policy

Imbas OS is currently preparing a public alpha. The first public wedge is HTML Artifact Vault: a local-first desktop vault for AI-generated HTML artifacts.

## Supported versions

Security support applies to the current `main` branch until public releases are tagged. After releases begin, this page will list supported release lines.

## Reporting a vulnerability

Please do **not** open a public issue for vulnerabilities.

Preferred private reporting path once the repository is public:

1. Use GitHub's private vulnerability reporting / Security Advisory flow if available.
2. Include reproduction steps, affected commit/version, platform, and impact.
3. If the issue involves generated HTML sandboxing, include the smallest safe HTML proof of concept.

If GitHub private reporting is not available yet, open a minimal public issue saying you have a security report, without exploit details, and a maintainer will arrange a private channel.

## Security model highlights

HTML Artifact Vault treats imported/generated HTML as untrusted by default:

- artifact replay uses a constrained `artifact://` path;
- renderer security disables Node integration and uses context isolation/sandboxing;
- generated artifacts are wrapped with a restrictive CSP;
- artifact-origin network requests are blocked by default;
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
