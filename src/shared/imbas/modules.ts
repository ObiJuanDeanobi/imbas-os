export type ImbasModuleId =
  | 'artifact-vault'
  | 'memsocket'
  | 'conduit'
  | 'sanctum'
  | 'lorekeeper'
  | 'runledger'
  | 'atlas'
  | 'synccore'
  | 'desktop'
  | 'mobile'
  | 'cli';

export type ImbasModuleHealth = 'ok' | 'limited' | 'planned' | 'not_configured' | 'unavailable' | 'error';

export interface ImbasModuleStatus {
  id: ImbasModuleId;
  title: string;
  description: string;
  enabled: boolean;
  available: boolean;
  configured: boolean;
  health: ImbasModuleHealth;
  capabilities: string[];
  notes?: string;
}

export type ImbasModuleRegistry = Record<ImbasModuleId, ImbasModuleStatus>;

export function createDefaultModuleRegistry(overrides: Partial<Record<ImbasModuleId, Partial<ImbasModuleStatus>>> = {}): ImbasModuleRegistry {
  const base: ImbasModuleRegistry = {
    'artifact-vault': {
      id: 'artifact-vault',
      title: 'Artifact Vault',
      description: 'Generated artifact, Markdown, snapshot, provenance, and safe replay workbench.',
      enabled: true,
      available: true,
      configured: true,
      health: 'ok',
      capabilities: ['artifacts.create', 'artifacts.search', 'artifacts.snapshot', 'markdown.vault_owned', 'graph.artifacts']
    },
    memsocket: {
      id: 'memsocket',
      title: 'Memsocket',
      description: 'Local-first memory, context event, search, projection, and context-pack engine.',
      enabled: false,
      available: false,
      configured: false,
      health: 'not_configured',
      capabilities: ['context.events', 'context.search', 'context.packs'],
      notes: 'Private preview uses an adapter/CLI boundary until Memsocket is merged into the Imbas OS 1.0 release story.'
    },
    conduit: {
      id: 'conduit',
      title: 'Conduit',
      description: 'Stable local API and connector layer for agents, CLI, Android, and UI surfaces.',
      enabled: true,
      available: true,
      configured: true,
      health: 'limited',
      capabilities: ['status.read', 'events.write', 'runs.write']
    },
    sanctum: {
      id: 'sanctum',
      title: 'Sanctum',
      description: 'Trust, redaction, approvals, permission, audit, and secret-handle boundary.',
      enabled: true,
      available: true,
      configured: false,
      health: 'limited',
      capabilities: ['text.redact', 'handles.validate'],
      notes: 'Encrypted/keyring-backed secret vault is not implemented yet.'
    },
    lorekeeper: {
      id: 'lorekeeper',
      title: 'Lorekeeper',
      description: 'Managed living wiki and durable Markdown knowledge layer.',
      enabled: false,
      available: false,
      configured: false,
      health: 'planned',
      capabilities: ['wiki.proposals', 'wiki.managed_blocks']
    },
    runledger: {
      id: 'runledger',
      title: 'Runledger',
      description: 'Agent run history, decisions, verification, and audit trail.',
      enabled: false,
      available: false,
      configured: false,
      health: 'planned',
      capabilities: ['runs.audit', 'runs.timeline']
    },
    atlas: {
      id: 'atlas',
      title: 'Atlas',
      description: 'Graph, search, and navigation across memories, artifacts, wiki pages, and runs.',
      enabled: false,
      available: false,
      configured: false,
      health: 'planned',
      capabilities: ['graph.search', 'graph.traverse']
    },
    synccore: {
      id: 'synccore',
      title: 'SyncCore',
      description: 'Sync, backup, restore, import/export, portability, and forget/delete propagation.',
      enabled: false,
      available: true,
      configured: false,
      health: 'limited',
      capabilities: ['sync.manifest', 'sync.status']
    },
    desktop: {
      id: 'desktop',
      title: 'Desktop',
      description: 'Electron desktop surface for seeing into and steering the AI operating layer.',
      enabled: true,
      available: true,
      configured: true,
      health: 'ok',
      capabilities: ['ui.artifacts', 'ui.wiki_bridge', 'ui.graph', 'ui.sync_status']
    },
    mobile: {
      id: 'mobile',
      title: 'Mobile',
      description: 'Android companion for capture, search, approvals, and recent agent activity.',
      enabled: false,
      available: false,
      configured: false,
      health: 'planned',
      capabilities: ['mobile.capture', 'mobile.approvals']
    },
    cli: {
      id: 'cli',
      title: 'CLI',
      description: 'Command-line control surface for setup, status, capture, export, and repair.',
      enabled: false,
      available: false,
      configured: false,
      health: 'planned',
      capabilities: ['cli.status', 'cli.repair']
    }
  };

  for (const [id, patch] of Object.entries(overrides) as [ImbasModuleId, Partial<ImbasModuleStatus>][]) {
    base[id] = { ...base[id], ...patch, id };
  }

  return base;
}

export function listEnabledModules(registry: ImbasModuleRegistry): ImbasModuleStatus[] {
  return Object.values(registry).filter((module) => module.enabled);
}
