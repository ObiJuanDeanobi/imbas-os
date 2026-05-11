import { contextBridge, ipcRenderer } from 'electron';
import type { ArtifactBundle, ArtifactGraph, ArtifactSearchResult, ArtifactSnapshot, ArtifactSummary, CreateArtifactInput, CreateMarkdownPageInput, MixedPromptPackageInput, SearchIndexStats, SyncManifest, SyncStatus, UnifiedSearchResult, UpdateArtifactMetadataInput, VaultInfo, WikiBridgeReport, WikiPageBundle } from '../shared/types.js';

const api = {
  vaultInfo: () => ipcRenderer.invoke('vault:info') as Promise<VaultInfo>,
  syncStatus: () => ipcRenderer.invoke('sync:status') as Promise<SyncStatus>,
  rebuildSyncManifest: () => ipcRenderer.invoke('sync:rebuild-manifest') as Promise<SyncManifest>,
  listArtifacts: () => ipcRenderer.invoke('artifacts:list') as Promise<ArtifactSummary[]>,
  searchArtifacts: (query: string) => ipcRenderer.invoke('artifacts:search', query) as Promise<ArtifactSearchResult[]>,
  searchArtifactsIndexed: (query: string) => ipcRenderer.invoke('artifacts:search-indexed', query) as Promise<ArtifactSearchResult[]>,
  searchUnified: (query: string) => ipcRenderer.invoke('vault:search-unified', query) as Promise<UnifiedSearchResult[]>,
  rebuildSearchIndex: () => ipcRenderer.invoke('search-index:rebuild') as Promise<SearchIndexStats>,
  artifactGraph: () => ipcRenderer.invoke('artifacts:graph') as Promise<ArtifactGraph>,
  indexWikiDirectory: () => ipcRenderer.invoke('wiki:index-directory') as Promise<ArtifactGraph | null>,
  wikiBridgeReport: () => ipcRenderer.invoke('wiki:report') as Promise<WikiBridgeReport | null>,
  readMarkdownPage: (pageId: string) => ipcRenderer.invoke('wiki:read', pageId) as Promise<WikiPageBundle | null>,
  createMarkdownPage: (input: CreateMarkdownPageInput) => ipcRenderer.invoke('markdown:create', input) as Promise<WikiPageBundle>,
  updateMarkdownPage: (pageId: string, markdown: string) => ipcRenderer.invoke('markdown:update', pageId, markdown) as Promise<WikiPageBundle>,
  createArtifact: (input: CreateArtifactInput) => ipcRenderer.invoke('artifacts:create', input) as Promise<ArtifactBundle>,
  importHtmlFile: () => ipcRenderer.invoke('artifacts:import-file') as Promise<ArtifactBundle | null>,
  importBundleDirectory: () => ipcRenderer.invoke('artifacts:import-bundle-directory') as Promise<ArtifactBundle | null>,
  readArtifact: (id: string) => ipcRenderer.invoke('artifacts:read', id) as Promise<ArtifactBundle>,
  updateNotes: (id: string, notes: string) => ipcRenderer.invoke('artifacts:update-notes', id, notes) as Promise<ArtifactBundle>,
  updateMetadata: (id: string, input: UpdateArtifactMetadataInput) => ipcRenderer.invoke('artifacts:update-metadata', id, input) as Promise<ArtifactBundle>,
  createSnapshot: (id: string) => ipcRenderer.invoke('artifacts:snapshot', id) as Promise<ArtifactBundle['metadata']>,
  listSnapshots: (id: string) => ipcRenderer.invoke('artifacts:snapshots', id) as Promise<ArtifactSnapshot[]>,
  restoreSnapshot: (id: string, snapshotId: string) => ipcRenderer.invoke('artifacts:restore-snapshot', id, snapshotId) as Promise<ArtifactBundle>,
  exportMarkdown: (id: string) => ipcRenderer.invoke('artifacts:export-markdown', id) as Promise<string>,
  exportJson: (id: string) => ipcRenderer.invoke('artifacts:export-json', id) as Promise<string>,
  exportPromptPackage: (id: string) => ipcRenderer.invoke('artifacts:export-prompt-package', id) as Promise<string>,
  exportMixedPromptPackage: (input: MixedPromptPackageInput) => ipcRenderer.invoke('vault:export-mixed-prompt-package', input) as Promise<string>,
  exportBundleDirectory: (id: string) => ipcRenderer.invoke('artifacts:export-bundle-directory', id) as Promise<string | null>,
  seedDemoVault: () => ipcRenderer.invoke('demo:seed') as Promise<ArtifactSummary[]>,
  loadMaliciousSample: () => ipcRenderer.invoke('sample:malicious') as Promise<string>,
  conduitStatus: () => ipcRenderer.invoke('conduit:status') as Promise<any>,
  conduitSearch: (query: string) => ipcRenderer.invoke('conduit:search', query) as Promise<any>,
  conduitContextPack: (task: string) => ipcRenderer.invoke('conduit:context-pack', task) as Promise<any>,
  conduitOpenClawDispatch: (input: { message: string; mode?: 'chat' | 'task'; agent?: string }) => ipcRenderer.invoke('conduit:openclaw-dispatch', input) as Promise<any>,
  conduitCreateMobilePairingChallenge: (input?: { ttlMs?: number; scopes?: string[] }) => ipcRenderer.invoke('conduit:mobile-pairing-challenge:create', input ?? {}) as Promise<any>,
  conduitRunReplay: (runId: string) => ipcRenderer.invoke('conduit:run-replay', runId) as Promise<any>,
  conduitCreateLorekeeperProposal: (input: any) => ipcRenderer.invoke('conduit:lorekeeper-proposal:create', input) as Promise<any>,
  conduitPreviewLorekeeperProposal: (id: string) => ipcRenderer.invoke('conduit:lorekeeper-proposal:preview', id) as Promise<any>,
  conduitApproveLorekeeperProposal: (id: string) => ipcRenderer.invoke('conduit:lorekeeper-proposal:approve', id) as Promise<any>,
  conduitRejectLorekeeperProposal: (id: string) => ipcRenderer.invoke('conduit:lorekeeper-proposal:reject', id) as Promise<any>,
  conduitApplyLorekeeperProposal: (id: string) => ipcRenderer.invoke('conduit:lorekeeper-proposal:apply', id) as Promise<any>,
  conduitListLorekeeperSnapshots: (targetPageId: string) => ipcRenderer.invoke('conduit:lorekeeper-snapshots:list', targetPageId) as Promise<any>
};

contextBridge.exposeInMainWorld('artifactVault', api);

export type ArtifactVaultApi = typeof api;
