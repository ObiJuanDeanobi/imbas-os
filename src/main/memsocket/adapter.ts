import { redactSensitiveText } from '../sanctum/secretHandles.js';
import { ImbasContextEventDraft, ImbasMemoryLayer, ImbasVisibility, validateContextEventDraft } from '../../shared/imbas/protocol.js';

export interface MemsocketContextEventPayload {
  namespace: string;
  session_id?: string;
  event_type: string;
  actor_kind: 'agent';
  actor_id: string;
  text: string;
  layers: ImbasMemoryLayer[];
  visibility: ImbasVisibility;
  tags: string[];
  source_uri?: string;
  metadata: Record<string, unknown>;
}

export interface MemsocketAdapterOptions {
  namespace?: string;
}

export function imbasEventToMemsocketPayload(
  event: ImbasContextEventDraft,
  options: MemsocketAdapterOptions = {}
): MemsocketContextEventPayload {
  const errors = validateContextEventDraft(event);
  if (errors.length) {
    throw new Error(`invalid Imbas context event: ${errors.join('; ')}`);
  }

  return {
    namespace: options.namespace ?? event.projectId ?? 'imbas-os',
    session_id: event.runId,
    event_type: event.type,
    actor_kind: 'agent',
    actor_id: event.agent,
    text: redactSensitiveText(event.text),
    layers: [event.layer],
    visibility: event.visibility,
    tags: buildTags(event),
    source_uri: event.source?.uri,
    metadata: {
      imbas_connector: event.connector,
      imbas_project_id: event.projectId,
      imbas_links: event.links ?? [],
      imbas_source: event.source,
      imbas_created_at: event.createdAt
    }
  };
}

function buildTags(event: ImbasContextEventDraft): string[] {
  const tags = new Set<string>(['imbas-os', `connector:${event.connector.trim().toLowerCase()}`]);
  if (event.projectId) tags.add(`project:${event.projectId}`);
  if (event.runId) tags.add(`run:${event.runId}`);
  return [...tags].sort();
}
