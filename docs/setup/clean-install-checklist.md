# Clean install checklist

Use this checklist during private beta and public 1.0 readiness testing.

## Environment

- [ ] Fresh machine, VM, container, disposable host, or fresh user profile.
- [ ] No inherited user OpenClaw config, previous Imbas OS vault, or developer-machine state.
- [ ] No hidden shell aliases/history required.
- [ ] Node/npm installed.
- [ ] Android tooling installed only if APK build is in scope.

## Source/package setup

- [ ] Clone or unpack from intended distribution path.
- [ ] Install dependencies.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run verify`.
- [ ] Run `npm run package:dev` if testing package/restore.

## Desktop app

- [ ] Start desktop app.
- [ ] Confirm Command Center/onboarding is coherent.
- [ ] Seed demo vault if using demo flow.
- [ ] Open artifact safely.
- [ ] Confirm security smoke still passes.

## Conduit

- [ ] Start with Conduit on loopback for desktop-only testing.
- [ ] Start with Conduit on private/tailnet IP for Android testing.
- [ ] Confirm `/v0/status` works.
- [ ] Confirm protected routes return `401` without mobile token.
- [ ] Confirm sensitive desktop-only HTTP routes remain blocked.

## OpenClaw integration

- [ ] Fresh OpenClaw profile/config where possible.
- [ ] Confirm OpenClaw can append event/run through supported path.
- [ ] Confirm Agent Console dispatch or connector flow records Runledger.
- [ ] Confirm no raw runtime metadata/secrets are persisted.

## Android

- [ ] Build or obtain APK from intended private path.
- [ ] Install on phone.
- [ ] Pair through QR or manual challenge/code.
- [ ] Run Diagnostics tab.
- [ ] Verify Status, Runs, Wiki proposals, Capture.
- [ ] Restart app and confirm session persistence.

## Lorekeeper review loop

- [ ] Create proposal.
- [ ] Preview before/after diff.
- [ ] Approve proposal.
- [ ] Apply managed block change on desktop.
- [ ] Confirm snapshot was created.
- [ ] Preview/restore snapshot using demo-safe data.
- [ ] Reject one proposal.
- [ ] Confirm Runledger entries exist.

## Backup/restore/delete/forget

- [ ] Export/package backup.
- [ ] Restore into clean target.
- [ ] Verify artifacts/wiki/Runledger/proposals survive.
- [ ] Revoke a mobile session.
- [ ] Test one delete/forget path.

## Documentation evidence

- [ ] List every doc page followed.
- [ ] Record every missing step.
- [ ] Convert missing steps into docs bugs or product bugs.
