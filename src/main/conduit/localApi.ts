import { redactSensitiveText } from '../sanctum/secretHandles.js';
import { ImbasContextEventDraft, ImbasRunSummaryDraft, validateContextEventDraft } from '../../shared/imbas/protocol.js';

export interface ConduitRecordStore {
  events: ImbasContextEventDraft[];
  runs: ImbasRunSummaryDraft[];
}

export interface ConduitResponse {
  status: number;
  body: unknown;
}

export function createConduitRecordStore(): ConduitRecordStore {
  return { events: [], runs: [] };
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
        implemented: ['GET /v0/status', 'POST /v0/events', 'POST /v0/runs'],
        pending: ['POST /v0/artifacts', 'GET /v0/search', 'POST /v0/context-packs', 'POST /v0/wiki/proposals', 'POST /v0/snapshots'],
        counts: { events: store.events.length, runs: store.runs.length }
      }
    };
  }

  if (request.method === 'POST' && path === '/v0/events') {
    const event = await readJson<ImbasContextEventDraft>(request);
    const errors = validateContextEventDraft(event);
    if (errors.length) return { status: 400, body: { errors } };
    const safeEvent = { ...event, text: redactSensitiveText(event.text), createdAt: event.createdAt ?? new Date().toISOString() };
    store.events.push(safeEvent);
    return { status: 202, body: { accepted: true, index: store.events.length - 1, event: safeEvent } };
  }

  if (request.method === 'POST' && path === '/v0/runs') {
    const run = await readJson<ImbasRunSummaryDraft>(request);
    const errors = validateRunSummaryDraft(run);
    if (errors.length) return { status: 400, body: { errors } };
    const safeRun = {
      ...run,
      task: redactSensitiveText(run.task),
      summary: redactSensitiveText(run.summary),
      verification: run.verification?.map(redactSensitiveText),
      followUps: run.followUps?.map(redactSensitiveText),
      createdAt: run.createdAt ?? new Date().toISOString()
    };
    store.runs.push(safeRun);
    return { status: 202, body: { accepted: true, index: store.runs.length - 1, run: safeRun } };
  }

  return { status: 404, body: { error: 'not_found', path, method: request.method } };
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
