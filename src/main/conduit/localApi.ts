import { extractSensitiveHandles, redactSensitiveText } from '../sanctum/secretHandles.js';
import { ImbasContextEventDraft, ImbasRunSummaryDraft, validateContextEventDraft } from '../../shared/imbas/protocol.js';
import { createDefaultModuleRegistry, ImbasModuleRegistry } from '../../shared/imbas/modules.js';
import { MemsocketCliClient } from '../memsocket/cliClient.js';
import { createRunledgerEntry, RunledgerEntry, searchRunledger } from '../runledger/store.js';
import { applyLorekeeperProposalToMarkdown, createLorekeeperProposal, LorekeeperProposal, searchLorekeeperProposals, transitionLorekeeperProposal } from '../lorekeeper/proposals.js';
import { readMarkdownPageFromVault, updateMarkdownPage } from '../markdown/markdownStore.js';
import { completePairingChallenge, createMobilePairingStore, createPairingChallenge, MobilePairingStore, MobileSessionScope, revokeMobileSession } from '../mobile/pairing.js';

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
  runledger: RunledgerEntry[];
  lorekeeperProposals: LorekeeperProposal[];
  mobile: MobilePairingStore;
  markdownRoot?: string;
  modules: ImbasModuleRegistry;
  memsocket?: MemsocketCliClient;
  persist?: () => Promise<void>;
}

export interface ConduitResponse {
  status: number;
  body: unknown;
}

export function createConduitRecordStore(): ConduitRecordStore {
  return { events: [], runs: [], sanctumAudit: [], runledger: [], lorekeeperProposals: [], mobile: createMobilePairingStore(), modules: createDefaultModuleRegistry() };
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
        implemented: ['GET /v0/status', 'GET /v0/events', 'GET /v0/runs', 'GET /v0/runledger', 'GET /v0/wiki/proposals', 'POST /v0/events', 'POST /v0/runs', 'POST /v0/search', 'POST /v0/context-packs', 'POST /v0/wiki/proposals', 'POST /v0/mobile/pairing-challenges', 'POST /v0/mobile/pairing-challenges/complete', 'POST /v0/mobile/sessions/:id/revoke', 'POST /v0/wiki/proposals/:id/apply'],
        modules: store.modules,
        pending: ['POST /v0/artifacts', 'POST /v0/snapshots'],
        counts: { events: store.events.length, runs: store.runs.length, runledger: store.runledger.length, lorekeeperProposals: store.lorekeeperProposals.length, mobileSessions: store.mobile.sessions.filter((session) => !session.revokedAt).length },
        recentEvents: store.events.slice(-5).reverse(),
        recentRuns: store.runs.slice(-5).reverse(),
        sanctumAudit: store.sanctumAudit.slice(-10).reverse(),
        recentRunledger: store.runledger.slice(-5).reverse(),
        recentLorekeeperProposals: store.lorekeeperProposals.slice(-5).reverse(),
        mobile: {
          pendingPairingChallenges: store.mobile.challenges.filter((challenge) => challenge.status === 'pending').length,
          activeSessions: store.mobile.sessions.filter((session) => !session.revokedAt).map((session) => ({ id: session.id, deviceLabel: session.deviceLabel, scopes: session.scopes, createdAt: session.createdAt }))
        }
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

  if (request.method === 'GET' && path === '/v0/runledger') {
    const limit = parseLimit(url.searchParams.get('limit'));
    return { status: 200, body: { entries: searchRunledger(store.runledger, url.searchParams.get('query') ?? '', limit), count: store.runledger.length } };
  }

  if (request.method === 'GET' && path === '/v0/wiki/proposals') {
    const limit = parseLimit(url.searchParams.get('limit'));
    return { status: 200, body: { proposals: searchLorekeeperProposals(store.lorekeeperProposals, url.searchParams.get('query') ?? '', limit), count: store.lorekeeperProposals.length } };
  }

  if (request.method === 'POST' && path === '/v0/mobile/pairing-challenges') {
    try {
      const body = await readJson<{ scopes?: MobileSessionScope[]; ttlMs?: number }>(request);
      const challenge = await createPairingChallenge(store.mobile, body);
      store.modules.mobile = { ...store.modules.mobile, enabled: true, available: true, configured: true, health: 'limited' };
      await store.persist?.();
      return { status: 202, body: { challenge } };
    } catch (error) {
      return { status: 400, body: { errors: [error instanceof Error ? error.message : String(error)] } };
    }
  }

  if (request.method === 'POST' && path === '/v0/mobile/pairing-challenges/complete') {
    try {
      const body = await readJson<{ challengeId: string; code: string; deviceLabel: string }>(request);
      const completed = await completePairingChallenge(store.mobile, body);
      store.runledger.push(createRunledgerEntry({ kind: 'event', connector: 'mobile', agent: completed.session.deviceLabel, title: 'Mobile companion paired', outcome: 'completed', summary: `Paired ${completed.session.deviceLabel}`, refs: [completed.session.id], createdAt: completed.session.createdAt }));
      store.modules.mobile = { ...store.modules.mobile, enabled: true, available: true, configured: true, health: 'ok' };
      store.modules.runledger = { ...store.modules.runledger, enabled: true, available: true, configured: true, health: 'limited' };
      await store.persist?.();
      return { status: 200, body: completed };
    } catch (error) {
      return { status: 400, body: { errors: [error instanceof Error ? error.message : String(error)] } };
    }
  }

  const mobileRevokeMatch = path.match(/^\/v0\/mobile\/sessions\/([^/]+)\/revoke$/);
  if (request.method === 'POST' && mobileRevokeMatch) {
    try {
      const session = await revokeMobileSession(store.mobile, mobileRevokeMatch[1]);
      await store.persist?.();
      return { status: 200, body: { session } };
    } catch (error) {
      return { status: 404, body: { errors: [error instanceof Error ? error.message : String(error)] } };
    }
  }

  if (request.method === 'POST' && path === '/v0/wiki/proposals') {
    try {
      const proposal = createLorekeeperProposal(await readJson(request));
      store.lorekeeperProposals.push(proposal);
      store.runledger.push(createRunledgerEntry({ kind: 'lorekeeper', connector: proposal.connector, agent: proposal.agent, title: proposal.title, outcome: 'proposed', summary: proposal.rationale, refs: [proposal.id, ...(proposal.sources ?? [])], createdAt: proposal.createdAt }));
      store.modules.lorekeeper = { ...store.modules.lorekeeper, enabled: true, available: true, configured: true, health: 'limited' };
      store.modules.runledger = { ...store.modules.runledger, enabled: true, available: true, configured: true, health: 'limited' };
      await store.persist?.();
      return { status: 202, body: { accepted: true, proposal } };
    } catch (error) {
      return { status: 400, body: { errors: [error instanceof Error ? error.message : String(error)] } };
    }
  }

  const proposalTransitionMatch = path.match(/^\/v0\/wiki\/proposals\/([^/]+)\/(approve|reject)$/);
  if (request.method === 'POST' && proposalTransitionMatch) {
    const proposal = store.lorekeeperProposals.find((item) => item.id === proposalTransitionMatch[1]);
    if (!proposal) return { status: 404, body: { error: 'proposal_not_found' } };
    const next = transitionLorekeeperProposal(proposal, proposalTransitionMatch[2] === 'approve' ? 'approved' : 'rejected');
    store.lorekeeperProposals[store.lorekeeperProposals.indexOf(proposal)] = next;
    await store.persist?.();
    return { status: 200, body: { proposal: next } };
  }


  const proposalApplyMatch = path.match(/^\/v0\/wiki\/proposals\/([^/]+)\/apply$/);
  if (request.method === 'POST' && proposalApplyMatch) {
    const proposal = store.lorekeeperProposals.find((item) => item.id === proposalApplyMatch[1]);
    if (!proposal) return { status: 404, body: { error: 'proposal_not_found' } };
    if (!store.markdownRoot) return { status: 400, body: { errors: ['markdownRoot is required for Lorekeeper apply'] } };
    if (!proposal.targetPageId) return { status: 400, body: { errors: ['proposal targetPageId is required for Lorekeeper apply'] } };
    try {
      const page = await readMarkdownPageFromVault(store.markdownRoot, proposal.targetPageId);
      const applied = applyLorekeeperProposalToMarkdown(page.markdown, proposal);
      const updated = applied.changed ? await updateMarkdownPage(store.markdownRoot, proposal.targetPageId, applied.markdown) : page;
      const next = transitionLorekeeperProposal(proposal, 'applied');
      store.lorekeeperProposals[store.lorekeeperProposals.indexOf(proposal)] = next;
      store.runledger.push(createRunledgerEntry({ kind: 'lorekeeper', connector: proposal.connector, agent: proposal.agent, title: `Applied ${proposal.title}`, outcome: 'applied', summary: `Applied Lorekeeper managed block ${applied.blockId} to ${proposal.targetPageId}`, refs: [proposal.id, proposal.targetPageId, ...(proposal.sources ?? [])] }));
      await store.persist?.();
      return { status: 200, body: { proposal: next, page: updated.node, blockId: applied.blockId, changed: applied.changed } };
    } catch (error) {
      return { status: 400, body: { errors: [error instanceof Error ? error.message : String(error)] } };
    }
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
    store.runledger.push(createRunledgerEntry({ kind: 'run', connector: safeRun.connector, agent: safeRun.agent, title: safeRun.task, outcome: safeRun.outcome, summary: safeRun.summary, refs: [safeRun.runId, ...(safeRun.artifacts ?? [])], createdAt: safeRun.createdAt }));
    store.modules.runledger = { ...store.modules.runledger, enabled: true, available: true, configured: true, health: 'limited' };
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
  const ledger = store.runledger
    .map((entry, index) => ({ kind: 'runledger', index, createdAt: entry.createdAt, title: entry.title, summary: entry.summary, outcome: entry.outcome }))
    .filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  const proposals = store.lorekeeperProposals
    .map((proposal, index) => ({ kind: 'lorekeeper_proposal', index, createdAt: proposal.createdAt, title: proposal.title, rationale: proposal.rationale, status: proposal.status }))
    .filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  return [...events, ...runs, ...ledger, ...proposals].slice(-limit).reverse();
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
