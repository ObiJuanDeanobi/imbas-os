# Backup, restore, delete, and forget plan

This is the 1.0 readiness checklist for data resilience and privacy lifecycle behavior.

## Current private-preview state

Implemented:

- private-preview tarball packaging;
- package content verification;
- artifact snapshots;
- Markdown snapshots before Lorekeeper apply;
- guarded Markdown snapshot restore;
- JSONL durable Conduit records.

Not production-complete:

- full app installer;
- signed releases;
- clean-machine backup/restore wizard;
- comprehensive delete/forget UX across every subsystem;
- public 1.0 evidence report.

## Required before public 1.0

### Backup/export

Prove exports include, as appropriate:

- artifacts and metadata;
- Markdown/wiki pages;
- snapshots;
- Conduit events/runs;
- Runledger;
- Lorekeeper proposals;
- Sanctum audit metadata without raw secrets;
- module configuration.

### Restore

Restore into a clean target and verify:

- artifacts replay safely;
- wiki pages and snapshots load;
- Runledger remains searchable;
- proposals retain status/provenance;
- context packs still build;
- Android can pair with the restored instance.

### Delete/forget

Test at least one path for:

- deleting an artifact/memory entry;
- removing or redacting sensitive context;
- revoking a mobile session;
- preserving audit records without preserving raw secret material.

### Rollback

Every migration or destructive cleanup needs:

- trigger condition;
- exact rollback procedure;
- backup/snapshot reference;
- post-rollback verification command.

## Safety boundary

Do not automatically delete quarantine/backups or prune Docker volumes as part of routine maintenance. Archive-and-prune passes require human approval and verified restic/B2 coverage.
