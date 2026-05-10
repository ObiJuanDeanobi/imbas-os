import { extractSensitiveHandles, redactSensitiveText } from '../sanctum/secretHandles.js';
import { ImbasContextEventDraft, ImbasRunSummaryDraft, validateContextEventDraft } from '../../shared/imbas/protocol.js';
import { createDefaultModuleRegistry, ImbasModuleRegistry } from '../../shared/imbas/modules.js';
import { MemsocketCliClient } from '../memsocket/cliClient.js';

export interface ConduitSanctumAuditEntry {
  createdAt: string;
  action: 'redacted_input';
  recordKind: 'event' | 'run';
  connector: string;
  agent: string;
  handles: string[];
  rawSecretLikeContent: boolean;
}

export interface ConduitRecordStore {
  events: ImbasContextEventDraft[];
  runs: ImbasRunSummaryDraft[];
  sanctumAudit: ConduitSanctumAuditEntry[];
  modules: ImbasModuleRegistry;
  memsocket?: MemsocketCliClient;
  persist?: () => Promise<void>;
}

export interface ConduitResponse {
  status: number;
  body: unknown;
}

export function createConduitRecordStore(): ConduitRecordStore {
  return { events: [], runs: [], sanctumAudit: [], modules: createDefaultModuleRegistry() };
}

export async function handleConduitRequest(request: Request, store: ConduitRecordStore): Promise<ConduitResponse> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';

  if (request.method === 'GET' && path === '/v0/status') {
    return {
      status: 200,
      body: {
        service: 'imbas-os-conduit',
        status: 'ok',
        implemented: ['GET /v0/status', 'GET /v0/events', 'GET /v0/runs', 'POST /v0/events', 'POST /v0/runs', 'POST /v0/search', 'POST /v0/context-packs'],
        modules: store.modules,
        pending: ['POST /v0/artifacts', 'POST /v0/wiki/proposals', 'POST /v0/snapshots'],
        counts: { events: store.events.length, runs: store.runs.length },
        recentEvents: store.events.slice(-5).reverse(),
        recentRuns: store.runs.slice(-5).reverse(),
        sanctumAudit: store.sanctumAudit.slice(-10).reverse()
      }
    };
  }

  if (request.method === 'GET' && path === '/v0/events') {
    const limit = parseLimit(url.searchParams.get('limit'));
    return { status: 200, body: { events: store.events.slice(-limit).reverse(), count: store.events.length } };
  }

  if (request.method === 'GET' && path === '/v0/runs') {
    const limit = parseLimit(url.searchParams.get('limit'));
    return { status: 200, body: { runs: store.runs.slice(-limit).reverse(), count: store.runs.length } };
  }

  if (request.method === 'POST' && path === '/v0/search') {
    const body = await readJson<{ query: string; limit?: number; namespace?: string; sessionId?: string }>(request);
    if (!body.query?.trim()) return { status: 400, body: { errors: ['query is required'] } };
    if (store.memsocket && store.modules.memsocket.enabled) {
      const result = await store.memsocket.search(body.query, { namespace: body.namespace, limit: body.limit, sessionId: body.sessionId });
      if (result.status === 'ok') return { status: 200, body: { backend: 'memsocket', result: result.json ?? result.stdout } };
    }
    return { status: 200, body: { backend: 'conduit-local', results: localSearch(store, body.query, body.limit ?? 10) } };
  }

  if (request.method === 'POST' && path === '/v0/context-packs') {
    const body = await readJson<{ task: string; projectId?: string; maxTokens?: number }>(request);
    if (!body.task?.trim()) return { status: 400, body: { errors: ['task is required'] } };
    if (store.memsocket && store.modules.memsocket.enabled) {
      const result = await store.memsocket.contextPack(body);
      if (result.status === 'ok') return { status: 200, body: { backend: 'memsocket', result: result.json ?? result.stdout } };
    }
    const results = localSearch(store, body.task, 8);
    return { status: 200, body: { backend: 'conduit-local', task: body.task, items: results, totalItems: results.length } };
  }

  if (request.method === 'POST' && path === '/v0/events') {
    const event = await readJson<ImbasContextEventDraft>(request);
    const errors = validateContextEventDraft(event);
    if (errors.length) return { status: 400, body: { errors } };
    const redactedText = redactSensitiveText(event.text);
    const safeEvent = { ...event, text: redactedText, createdAt: event.createdAt ?? new Date().toISOString() };
    recordRedactionAudit(store, 'event', event.connector, event.agent, event.text, redactedText);
    store.events.push(safeEvent);
    await store.persist?.();
    let memsocketWrite: unknown = null;
    if (store.memsocket && store.modules.memsocket.enabled) {
      memsocketWrite = await store.memsocket.writeEvent(safeEvent);
      if ((memsocketWrite as { status?: string }).status === 'error') store.modules.memsocket.health = 'error';
    }
    return { status: 202, body: { accepted: true, index: store.events.length - 1, event: safeEvent, memsocketWrite } };
  }

  if (request.method === 'POST' && path === '/v0/runs') {
    const run = await readJson<ImbasRunSummaryDraft>(request);
    const errors = validateRunSummaryDraft(run);
    if (errors.length) return { status: 400, body: { errors } };
    const originalRunText = [run.task, run.summary, ...(run.verification ?? []), ...(run.followUps ?? [])].join('\n');
    const safeRun = {
      ...run,
      task: redactSensitiveText(run.task),
      summary: redactSensitiveText(run.summary),
      verification: run.verification?.map(redactSensitiveText),
      followUps: run.followUps?.map(redactSensitiveText),
      createdAt: run.createdAt ?? new Date().toISOString()
    };
    const redactedRunText = [safeRun.task, safeRun.summary, ...(safeRun.verification ?? []), ...(safeRun.followUps ?? [])].join('\n');
    recordRedactionAudit(store, 'run', run.connector, run.agent, originalRunText, redactedRunText);
    store.runs.push(safeRun);
    await store.persist?.();
    return { status: 202, body: { accepted: true, index: store.runs.length - 1, run: safeRun } };
  }

  return { status: 404, body: { error: 'not_found', path, method: request.method } };
}



function recordRedactionAudit(store: ConduitRecordStore, recordKind: 'event' | 'run', connector: string, agent: string, original: string, redacted: string): void {
  if (original === redacted) return;
  store.sanctumAudit.push({
    createdAt: new Date().toISOString(),
    action: 'redacted_input',
    recordKind,
    connector,
    agent,
    handles: extractSensitiveHandles(original),
    rawSecretLikeContent: extractSensitiveHandles(original).length === 0
  });
}

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
}

function localSearch(store: ConduitRecordStore, query: string, limit: number): unknown[] {
  const needle = query.toLowerCase();
  const events = store.events
    .map((event, index) => ({ kind: 'event', index, createdAt: event.createdAt, connector: event.connector, agent: event.agent, text: event.text, type: event.type, projectId: event.projectId }))
    .filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  const runs = store.runs
    .map((run, index) => ({ kind: 'run', index, createdAt: run.createdAt, connector: run.connector, agent: run.agent, runId: run.runId, task: run.task, summary: run.summary, outcome: run.outcome }))
    .filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  return [...events, ...runs].slice(-limit).reverse();
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error('invalid JSON body');
  }
}

function validateRunSummaryDraft(run: ImbasRunSummaryDraft): string[] {
  const errors: string[] = [];
  if (!run.connector?.trim()) errors.push('connector is required');
  if (!run.agent?.trim()) errors.push('agent is required');
  if (!run.runId?.trim()) errors.push('runId is required');
  if (!run.task?.trim()) errors.push('task is required');
  if (!run.summary?.trim()) errors.push('summary is required');
  if (!['completed', 'blocked', 'failed', 'cancelled'].includes(run.outcome)) errors.push('outcome is invalid');
  return errors;
}
