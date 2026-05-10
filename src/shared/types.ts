export type TrustLevel = 'untrusted' | 'reviewed' | 'trusted';
export type SourceType = 'paste' | 'file' | 'url' | 'generated';

export type ArtifactMetadata = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceType: SourceType;
  prompt: string;
  model: string;
  provider: string;
  sourcePath?: string;
  project?: string;
  trustLevel: TrustLevel;
  tags: string[];
  hashes: { sha256Html: string };
  links: string[];
  snapshotCount: number;
};

export type ArtifactSummary = ArtifactMetadata & {
  bundlePath: string;
  notePreview: string;
};

export type ArtifactSearchResult = ArtifactSummary & {
  matchReason: string;
};

export type SearchIndexStats = {
  indexPath: string;
  artifactCount: number;
  rebuiltAt: string;
};

export type CreateArtifactInput = {
  html: string;
  title?: string;
  sourceType?: SourceType;
  prompt?: string;
  model?: string;
  provider?: string;
  sourcePath?: string;
  project?: string;
  tags?: string[];
};

export type UpdateArtifactMetadataInput = {
  title?: string;
  tags?: string[];
  trustLevel?: TrustLevel;
  prompt?: string;
  model?: string;
  provider?: string;
  sourcePath?: string;
  project?: string;
};

export type ArtifactBundle = {
  metadata: ArtifactMetadata;
  html: string;
  notes: string;
  bundlePath: string;
};

export type ArtifactSnapshot = {
  id: string;
  createdAt: string;
  htmlPath: string;
  metadataPath: string;
};

export type ArtifactGraphNode = {
  id: string;
  kind?: 'artifact' | 'wiki';
  title: string;
  tags: string[];
  project?: string;
};

export type WikiPageNode = ArtifactGraphNode & {
  kind: 'wiki';
  path: string;
  relativePath: string;
  sourceOwnership: 'external-readonly' | 'imported-copy' | 'vault-owned';
  wikilinks: { target: string; label?: string; embed: boolean }[];
  artifactLinks: string[];
};

export type WikiPageBundle = {
  node: WikiPageNode;
  markdown: string;
};

export type UnifiedSearchResult = {
  id: string;
  kind: 'artifact' | 'wiki';
  title: string;
  tags: string[];
  project?: string;
  matchReason: string;
  sourceOwnership?: WikiPageNode['sourceOwnership'];
  relativePath?: string;
  trustLevel?: TrustLevel;
  createdAt?: string;
};

export type MixedPromptPackageInput = {
  artifactIds: string[];
  wikiPageIds: string[];
};

export type CreateMarkdownPageInput = {
  title: string;
  markdown?: string;
  tags?: string[];
};

export type SyncNode = {
  id: string;
  displayName: string;
  createdAt: string;
};

export type SyncLogicalType =
  | 'artifact-html'
  | 'artifact-metadata'
  | 'artifact-notes'
  | 'artifact-snapshot-html'
  | 'artifact-snapshot-metadata'
  | 'markdown-page'
  | 'vault-manifest'
  | 'unknown';

export type SyncManifestEntry = {
  path: string;
  hash: string;
  bytes: number;
  logicalType: SyncLogicalType;
  updatedAt: string;
  lastWriterNode: string;
  trustLevel?: TrustLevel;
};

export type SyncManifest = {
  version: 1;
  rootId: string;
  generatedAt: string;
  nodeId: string;
  entries: SyncManifestEntry[];
};

export type SyncChange = SyncManifestEntry & {
  previousHash?: string;
  reason?: 'new-file' | 'changed-file' | 'deleted-file' | 'remote-writer-diverged' | 'trust-level-change-requires-review';
};

export type SyncStatus = {
  localNode: SyncNode;
  manifestPath: string;
  manifestGeneratedAt?: string;
  trackedFiles: number;
  changedFiles: SyncChange[];
  conflictCandidates: SyncChange[];
};

export type ArtifactGraphEdge = {
  from: string;
  to: string;
  kind?: 'artifact-link' | 'wikilink';
};

export type ArtifactGraph = {
  nodes: ArtifactGraphNode[];
  edges: ArtifactGraphEdge[];
};

export type WikiBridgeReport = {
  root: string;
  pageCount: number;
  wikilinkCount: number;
  resolvedWikilinkCount: number;
  unresolvedWikilinks: { from: string; target: string }[];
  artifactLinkCount: number;
  resolvedArtifactLinkCount: number;
  unresolvedArtifactLinks: { from: string; artifactId: string }[];
  orphanPageCount: number;
  orphanPages: string[];
  recommendation: 'bridge' | 'migration-premature' | 'investigate';
};

export type VaultInfo = {
  root: string;
  artifactsDir: string;
  artifactCount: number;
};
