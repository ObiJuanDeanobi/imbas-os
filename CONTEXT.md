# Domain Glossary

## Artifact Vault
The local storage environment acting as a "Second Brain" for the user. It is a repository that cleanly manages generated HTML artifacts, Markdown files, and other AI-produced output in a single, searchable environment.

## Artifact (or HTML Artifact)
A discrete generated file (typically HTML) that can be saved, replayed safely in a sandbox, versioned (via snapshots), and augmented with context, metadata, and provenance.

## Markdown Note
A standalone Markdown file within the Artifact Vault. It represents user-authored notes, documentation, or unstructured data, and can be linked bidirectionally with Artifacts and other Markdown Notes to form the underlying knowledge graph.

## Provenance
The metadata that proves the origin, history, and safety of an Artifact. It answers "where did this come from and can I trust it?" by tracking the `sourceType` (e.g. generated, pasted, imported), the exact AI `prompt`, `model`, and `provider` used to create it, and its current `trustLevel` with a full audit log of trust changes.
