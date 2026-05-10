# Sanctum Agent Secret Vault

Sanctum is the Imbas OS subsystem for trust, permissions, redaction, approvals, artifact sandbox policy, connector scopes, local auth, and safe secret use.

## Principle

> Agents may request the use of a secret-backed capability; they should not need to see the secret itself.

Agents should receive handles/capabilities, not raw tokens, passwords, keys, or credentials.

Examples:

```text
secret://github/personal-access-token
secret://cloudflare/api-token
secret://email/smtp-password
capability://github/create-private-repo
capability://b2/write-backup
```

## Why this matters

Imbas OS is meant to be mostly autonomous after setup. That is only safe if agents can use necessary credentials without leaking them into:

- prompts;
- chat transcripts;
- Memsocket memory events;
- Runledger logs;
- Lorekeeper wiki pages;
- Artifact Vault artifacts;
- context packs;
- screenshots/exports;
- other agents.

## Expected behavior

Sanctum should:

- store encrypted secret values locally or delegate to OS/keyring/vault backends;
- expose opaque handles to agents;
- let trusted tools/connectors resolve handles at execution boundary;
- scope each secret/capability to allowed tools, connectors, and operations;
- require approval for sensitive uses when policy says so;
- log sensitive access attempts without logging raw secret values;
- redact known secret values and patterns from logs/memory/artifacts/context packs;
- support expiry and rotation metadata;
- prefer scoped capabilities over raw secret handles where possible.

## Non-goals for private preview

- Do not build a full enterprise secrets manager.
- Do not expose secrets to generated HTML artifacts.
- Do not grant all agents all secrets.
- Do not store raw secrets in Memsocket, Lorekeeper, Runledger, Artifact Vault, or context packs.

## Private-preview implementation direction

Recommended first path:

1. Store secret metadata/policies in Imbas OS.
2. Store raw values in a local encrypted file or OS keyring where available.
3. Resolve handles only inside trusted connector/tool execution.
4. Emit Runledger audit events for access.
5. Redact values before any memory/wiki/artifact/context write.

## Example flow

Agent wants to create a private GitHub repo.

Bad flow:

```text
Agent receives raw GITHUB_TOKEN and calls GitHub itself.
```

Good flow:

```text
Agent requests capability://github/create-private-repo
Sanctum checks policy and approval requirements
Conduit/GitHub tool resolves the underlying token internally
Tool creates the repo
Runledger records action + capability handle + outcome, never raw token
```

## Design questions

- Which secrets require approval every time?
- Which tools/connectors are allowed to resolve which handles?
- Should Android be able to approve secret-backed actions?
- Should local keyring be required on desktop, or optional?
- How should secret rotation reminders surface?

## Private-preview implementation status

Sprint 3 adds an encrypted local Sanctum vault foundation in `src/main/sanctum/vault.ts`.

Implemented now:

- AES-256-GCM encrypted local JSON vault file.
- Passphrase-derived key via `scrypt`.
- Secret metadata remains visible; raw secret values are encrypted and not stored in plaintext.
- Secret resolution is policy checked by connector, tool, purpose, and approval state.
- Resolution attempts are audited without logging raw secret values.
- Conduit records a Sanctum redaction audit entry when incoming event/run text contains handles or raw secret-like content that gets redacted before storage/search/Memsocket.

Private-preview limitations:

- Passphrase/key source is not finalized; OS keyring integration remains future work.
- Approval UX is not implemented yet; callers pass explicit approval state at trusted execution boundaries.
- Audit entries are local JSONL/private-preview records, not full Runledger yet.
- Secrets should still not be pasted into chats/prompts/logs. Handles/capabilities remain the intended agent-facing interface.
