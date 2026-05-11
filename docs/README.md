# Imbas OS documentation library

This is the canonical documentation index for Imbas OS private preview and future public 1.0 readiness.

Imbas OS documentation has three jobs:

1. Help a human install, use, and trust the system.
2. Help AI agents work safely in the repo without hidden context.
3. Provide release evidence: setup, verification, rollback, security, and known limitations.

## Start here

- [Human product overview](imbas/human-readme.md) — what Imbas OS is and why it exists.
- [Agent operating guide](imbas/agent-readme.md) — how AI agents should work in this repo.
- [Private-preview implementation status](implementation-status.md) — current reality, evidence, and blockers.
- [Fresh-system public 1.0 gate](release/fresh-system-1.0-gate.md) — mandatory release gate before public 1.0.

## Setup and onboarding

- [Local development setup](setup/local-development.md) — install, run, verify, and troubleshoot locally.
- [Private-preview package restore](private-preview-restore.md) — create and verify the dev preview tarball.
- [Android companion setup](setup/android-companion.md) — build/install APK, pair, run diagnostics, and test mobile flows.
- [OpenClaw integration setup](setup/openclaw-integration.md) — connect OpenClaw through Conduit/private-preview dispatch.

## How to use Imbas OS

- [User guide](how-to/use-imbas-os.md) — day-to-day desktop, Agent Console, artifacts, wiki, and Runledger flows.
- [Lorekeeper review workflow](how-to/lorekeeper-review.md) — propose, preview, approve, apply, snapshot, restore.
- [Android companion guide](mobile/android-companion.md) — mobile concepts, scopes, endpoints, diagnostics, and current screen contract.

## Architecture and subsystem docs

- [Subsystem map](architecture/subsystems.md)
- [AI-first OS principle](architecture/ai-first-os.md)
- [Module selection and install profiles](architecture/module-selection.md)
- [MemPalace → Imbas/Memsocket migration](architecture/memory-migration.md)
- [Memsocket adapter](architecture/memsocket-adapter.md)
- [Memsocket/agentmemory patterns](architecture/memsocket-agentmemory-patterns.md)
- [Connector protocol](connectors/protocol.md)
- [Sanctum agent secret vault](sanctum/agent-secret-vault.md)
- [Threat model](threat-model.md)
- [File format](file-format.md)

## Strategy and go-to-market

- [Business model strategy](strategy/business-model.md) — free/open-source core, Patreon supporter tiers, and future paid cloud/workspace product boundaries.
- [Pitch](pitch.md) — current product pitch and wedge.

## Operations and release readiness

- [Verification and test gates](ops/verification.md)
- [Backup, restore, delete, and forget plan](ops/backup-restore-delete-forget.md)
- [Release plan](release-plan.md)
- [Documentation readiness for 1.0](release/documentation-1.0-gate.md)

## Documentation standards for 1.0

Before public 1.0, every supported module/profile needs:

- a human-facing overview;
- setup steps from a clean machine;
- common workflows;
- verification commands;
- rollback/recovery notes;
- security/privacy boundaries;
- troubleshooting notes;
- agent-facing contract docs where agents will operate it.

Docs must be tested against a fresh environment during the [fresh-system public 1.0 gate](release/fresh-system-1.0-gate.md). If a setup step relies on hidden VPS state, shell history, private secrets, or undocumented OpenClaw configuration, the gate fails.
