# Fresh-system public 1.0 gate

Imbas OS must not be pushed as public 1.0 until the full user experience has been tested from scratch on a clean system.

This is stricter than package verification. It is a human/product gate: can a new user set up OpenClaw + Imbas OS + all supported modules + mobile companion and have the system work smoothly end-to-end?

## Release rule

No public 1.0 release, package publish, public repo launch, hosted service, or public announcement without explicit Johnathan approval after this gate passes.

## Test environment requirement

Run the gate on a fresh environment, not the development VPS state.

Acceptable environments:

- a disposable VPS;
- a clean VM;
- a clean container/desktop test image where GUI/mobile constraints are represented honestly;
- a fresh user account only if it avoids inherited OpenClaw/Imbas/MemPalace config and secrets.

The test must not depend on hidden local state from `/home/ubuntu/.openclaw`, existing MemPalace, existing Mattermost/Hermes setup, or developer-only shell history.

## Required end-to-end scenario

### 0. Documentation readiness

- Follow the [documentation readiness gate](documentation-1.0-gate.md).
- Confirm setup/use/security/backup docs are sufficient without private chat history or hidden VPS state.
- Record every undocumented step as a docs bug or product bug.

### 1. Install/setup

- Install or restore Imbas OS from the intended private/public package path.
- Start the desktop app.
- Confirm the user sees a coherent Imbas OS onboarding/home experience, not only Artifact Vault internals.
- Enable the full-supported module profile:
  - Memsocket;
  - Artifact Vault;
  - Lorekeeper;
  - Conduit;
  - Runledger;
  - Sanctum;
  - Atlas/search;
  - SyncCore/backup where supported;
  - Desktop;
  - Mobile companion;
  - CLI/admin tools where supported.

### 2. Fresh OpenClaw connection

- Start from a brand-new OpenClaw config/profile.
- Connect OpenClaw to Imbas OS through the supported connector path.
- Verify OpenClaw can:
  - discover Imbas capabilities;
  - append a run/event;
  - save an artifact;
  - request/retrieve a context pack;
  - propose a Lorekeeper/wiki update;
  - respect Sanctum redaction/secret boundaries.

### 3. Agent/system adapters

For each supported public 1.0 adapter/profile, verify the documented happy path and one failure path:

- OpenClaw;
- Hermes if included in 1.0;
- Codex if included in 1.0;
- Claude Code or other agents only if they are explicitly in scope.

Each adapter must record enough Runledger evidence to answer:

- what was requested;
- which context was used;
- what changed;
- what was verified;
- what needs approval.

### 4. Memory migration posture

- Confirm Memsocket is first-class in the Imbas OS profile.
- Confirm no required 1.0 path depends on MemPalace.
- If MemPalace import/compatibility exists, test it as migration/import/fallback, not as the core memory requirement.

### 5. Android companion

- Install companion APK from the intended distribution path.
- Pair with the fresh Imbas OS instance.
- Verify live, non-demo data for:
  - status;
  - Runledger;
  - Lorekeeper proposals;
  - approval/reject flow where supported;
  - token/session persistence using secure storage.

### 6. Human review loop

- Start a real task from chat/Agent Console.
- Save at least one artifact.
- Create at least one Lorekeeper proposal.
- Approve/apply one safe proposal.
- Reject one proposal.
- Confirm snapshots/audit trail exist.

### 7. Backup/restore/delete

- Create a backup/export.
- Restore into a clean target.
- Verify artifacts, memory/context events, wiki pages, Runledger, approvals, and module config survive correctly.
- Test delete/forget behavior for at least one memory/artifact path.

### 8. Security/safety checks

- Generated HTML remains sandboxed.
- Network-block/security smoke fixture passes.
- Secrets do not appear in artifacts, wiki pages, logs, memory events, context packs, or Runledger.
- Risky/external actions require approval.
- Public routes are not exposed without authentication and release approval.

## Evidence required

The release candidate needs a completion report containing:

- environment description;
- exact install steps;
- documentation pages followed and any doc gaps found;
- module profile used;
- adapter versions/configs;
- screenshots or logs for desktop and Android pairing;
- test results;
- backup/restore proof;
- security smoke proof;
- known issues;
- rollback/recovery notes;
- Johnathan approval record.

## Current status

This gate has **not** passed yet.

Current private-preview work is allowed to continue, but it must not be represented as public-ready until this fresh-system gate passes.
