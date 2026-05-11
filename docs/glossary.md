# Glossary

## Imbas OS

The umbrella product: a local-first operating layer for AI agents, artifacts, memory, wiki knowledge, run history, approvals, and context packs.

## Memsocket

Memory and context engine for storing events, projections, retrieval indexes, and context packs. Public 1.0 requires Memsocket to be first-class in the Imbas OS release story.

## Artifact Vault

Generated artifact and wiki workbench foundation. Stores HTML artifacts, metadata, notes, snapshots, provenance, and safe replay.

## Lorekeeper

Proposal-first living wiki workflow. Agents can propose durable Markdown updates; humans review, approve, apply, snapshot, and restore.

## Conduit

Connector/API layer for agents and companion apps. It exposes status, events, runs, artifacts, search, context packs, Lorekeeper, mobile pairing, and private-preview dispatch paths.

## Runledger

Durable run/audit timeline. Records agent runs, events, Lorekeeper proposals/applies/restores, redaction events, and other evidence.

## Sanctum

Trust, permission, redaction, approvals, and secret/capability boundary. Future connector execution should resolve secrets through Sanctum handles, not raw secret values.

## Atlas

Graph/search/navigation layer over artifacts, wiki pages, links, and context.

## SyncCore

Sync, backup, import/export, and restore layer. Current private-preview work has package/restore and sync manifest foundations.

## Context pack

A bounded bundle of relevant context for an agent run: events, artifacts, wiki snippets, provenance, and safety boundaries.

## Managed block

A fenced Markdown region that Lorekeeper may update while preserving human-owned content outside the block.

## Mobile session

Scoped Android companion session created through a short-lived pairing challenge. Imbas OS stores a token hash; Android stores the returned token encrypted with Android Keystore.

## Private preview

Current development stage. Features are usable for dogfooding but not public-release-ready.

## Public 1.0 gate

Fresh-system release gate requiring clean setup, OpenClaw integration, Android pairing, backup/restore, security checks, docs validation, and explicit approval.
