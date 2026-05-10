export type ImbasVisibility = 'public' | 'local' | 'private' | 'secret_pointer';
export type ImbasMemoryLayer = 'episodic' | 'semantic' | 'profile' | 'procedural' | 'causal' | 'live_state';

export interface ImbasSourceRef {
  uri: string;
  label?: string;
  hash?: string;
}

export interface ImbasContextEventDraft {
  connector: string;
  agent: string;
  runId?: string;
  projectId?: string;
  type: string;
  layer: ImbasMemoryLayer;
  visibility: ImbasVisibility;
  text: string;
  source?: ImbasSourceRef;
  links?: string[];
  createdAt?: string;
}

export interface ImbasRunSummaryDraft {
  connector: string;
  agent: string;
  runId: string;
  task: string;
  outcome: 'completed' | 'blocked' | 'failed' | 'cancelled';
  summary: string;
  verification?: string[];
  artifacts?: string[];
  followUps?: string[];
  sensitiveAccessRefs?: string[];
  createdAt?: string;
}

export interface ImbasContextPackRequest {
  task: string;
  projectId?: string;
  connector?: string;
  agent?: string;
  maxTokens?: number;
  allowedVisibility?: ImbasVisibility[];
}

export function normalizeConnectorName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

export function validateContextEventDraft(event: ImbasContextEventDraft): string[] {
  const errors: string[] = [];
  if (!normalizeConnectorName(event.connector)) errors.push('connector is required');
  if (!event.agent.trim()) errors.push('agent is required');
  if (!event.type.trim()) errors.push('type is required');
  if (!event.text.trim()) errors.push('text is required');
  if (event.visibility === 'secret_pointer' && !event.text.includes('secret://') && !event.text.includes('capability://')) {
    errors.push('secret_pointer events should reference a Sanctum handle or capability');
  }
  return errors;
}
