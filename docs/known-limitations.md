# Known limitations

This page is intentionally blunt. Imbas OS is private-preview software, not public 1.0.

## Release/distribution

- No public release approval yet.
- No production installer, signing, notarization, or app-store distribution.
- Dev preview package exists, but public distribution is blocked by the fresh-system gate.

## Memory engine and memory migration

- Memsocket custom development is paused as of 2026-05-20.
- agentmemory is the primary live-memory candidate for OpenClaw/Hermes dogfood.
- Imbas OS public 1.0 memory requirements need to be rewritten around whichever memory module is proven in regular use.
- MemPalace remains the working OpenClaw/Hermes recall safety net.
- MemPalace must not be removed until migration criteria pass and the maintainer explicitly approves.

## Connectors

- OpenClaw private-preview dispatch works through a constrained local CLI adapter.
- Direct Gateway integration still needs deliberate auth/scope hardening.
- Hermes, Codex, Claude Code, and other connector SDKs are not production-ready yet.

## Android companion

- Real phone validation is still required for QR camera scan, speech recognition/dictation, install/update flow, and long-lived session persistence.
- Photo capture is not implemented yet.
- Android can approve/reject proposals but does not directly apply/restore wiki pages.
- Public mobile distribution/signing is not decided.

## Cloud/team/business

- Hosted cloud workspace does not exist yet.
- Team/org workspaces, admin controls, SSO, managed backups, and compliance exports are future paid-product surfaces.
- Patreon/supporter early access is not business/team support.

## Security and ops

- Cloudflare Access for the browser GUI is preferred but not fully automated/configured in the project.
- Production auth/capability model is not complete.
- OS keyring/passphrase UX for Sanctum is not complete.
- Backup/restore/delete/forget behavior needs clean-system evidence before public 1.0.

## Documentation

- Documentation library exists, but the docs must still be tested against a fresh environment.
- Any undocumented setup step discovered during the fresh-system gate is a docs bug or product bug.
