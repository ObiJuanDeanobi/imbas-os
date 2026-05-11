import { extractSensitiveHandles, redactSensitiveText } from '../sanctum/secretHandles.js';
import { ImbasContextEventDraft, ImbasRunSummaryDraft, validateContextEventDraft } from '../../shared/imbas/protocol.js';
import { createDefaultModuleRegistry, ImbasModuleRegistry } from '../../shared/imbas/modules.js';
import { MemsocketCliClient } from '../memsocket/cliClient.js';
import { createRunledgerEntry, RunledgerEntry, searchRunledger } from '../runledger/store.js';
import { applyLorekeeperProposalToMarkdown, createLorekeeperProposal, LorekeeperProposal, searchLorekeeperProposals, transitionLorekeeperProposal } from '../lorekeeper/proposals.js';
import { createMarkdownSnapshot, listMarkdownSnapshots, readMarkdownPageFromVault, readMarkdownSnapshot, updateMarkdownPage } from '../markdown/markdownStore.js';
import { createArtifact } from '../vault/vaultStore.js';
import { OpenClawDispatcher } from '../openclaw/dispatcher.js';
import type { CreateArtifactInput } from '../../shared/types.js';
import { authenticateMobileSession, completePairingChallenge, createMobilePairingStore, createPairingChallenge, MobilePairingStore, MobileSessionScope, revokeMobileSession } from '../mobile/pairing.js';

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
  vaultRoot?: string;
  modules: ImbasModuleRegistry;
  memsocket?: MemsocketCliClient;
  openclawDispatcher?: OpenClawDispatcher;
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
        implemented: ['GET /v0/status', 'GET /v0/events', 'GET /v0/runs', 'GET /v0/runledger', 'GET /v0/replay/runs/:id', 'GET /v0/wiki/proposals', 'GET /v0/wiki/snapshots', 'GET /v0/wiki/snapshots/preview', 'POST /v0/agents/openclaw/dispatch', 'POST /v0/events', 'POST /v0/runs', 'POST /v0/artifacts', 'POST /v0/search', 'POST /v0/context-packs', 'POST /v0/wiki/proposals', 'POST /v0/mobile/pairing-challenges', 'POST /v0/mobile/pairing-challenges/complete', 'POST /v0/mobile/sessions/:id/revoke', 'POST /v0/wiki/proposals/:id/preview', 'POST /v0/wiki/proposals/:id/apply'],
        modules: store.modules,
        pending: ['POST /v0/snapshots'],
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

  const runReplayMatch = path.match(/^\/v0\/replay\/runs\/([^/]+)$/);
  if (request.method === 'GET' && runReplayMatch) {
    return { status: 200, body: buildRunReplay(store, decodeURIComponent(runReplayMatch[1])) };
  }

  if (request.method === 'GET' && path === '/v0/wiki/proposals') {
    const limit = parseLimit(url.searchParams.get('limit'));
    return { status: 200, body: { proposals: searchLorekeeperProposals(store.lorekeeperProposals, url.searchParams.get('query') ?? '', limit), count: store.lorekeeperProposals.length } };
  }

  if (request.method === 'GET' && path === '/v0/wiki/snapshots') {
    if (!store.markdownRoot) return { status: 400, body: { errors: ['markdownRoot is required for Lorekeeper snapshots'] } };
    const targetPageId = url.searchParams.get('targetPageId');
    if (!targetPageId) return { status: 400, body: { errors: ['targetPageId is required'] } };
    try {
      return { status: 200, body: { snapshots: await listMarkdownSnapshots(store.markdownRoot, targetPageId) } };
    } catch (error) {
      return { status: 400, body: { errors: [error instanceof Error ? error.message : String(error)] } };
    }
  }


  if (request.method === 'GET' && path === '/v0/wiki/snapshots/preview') {
    if (!store.markdownRoot) return { status: 400, body: { errors: ['markdownRoot is required for Lorekeeper snapshot preview'] } };
    const targetPageId = url.searchParams.get('targetPageId');
    const snapshotPath = url.searchParams.get('snapshotPath');
    if (!targetPageId || !snapshotPath) return { status: 400, body: { errors: ['targetPageId and snapshotPath are required'] } };
    try {
      return { status: 200, body: { snapshot: await readMarkdownSnapshot(store.markdownRoot, targetPageId, snapshotPath) } };
    } catch (error) {
      return { status: 400, body: { errors: [error instanceof Error ? error.message : String(error)] } };
    }
  }


  if (request.method === 'POST' && path === '/v0/agents/openclaw/dispatch') {
    try {
      const body = await readJson<{ message: string; mode?: 'chat' | 'task'; agent?: string }>(request);
      const message = body.message?.trim();
      if (!message) return { status: 400, body: { errors: ['message is required'] } };
      const mode = body.mode === 'task' ? 'task' : 'chat';
      const targetAgent = body.agent?.trim() || 'OpenClaw';
      if (!['OpenClaw', 'Auto-route'].includes(targetAgent)) {
        const runId = createAgentDispatchRunId();
        const summary = `${targetAgent} live dispatch is not wired yet. OpenClaw is the private-preview connector in this slice.`;
        const run = { connector: 'Imbas OS Agent Console', agent: targetAgent, runId, task: redactSensitiveText(message), outcome: 'blocked' as const, summary, verification: ['No external dispatch attempted'], createdAt: new Date().toISOString() };
        store.runs.push(run);
        store.runledger.push(createRunledgerEntry({ kind: 'run', connector: run.connector, agent: run.agent, title: `Agent Console dispatch blocked: ${targetAgent}`, outcome: 'blocked', summary, refs: [runId], createdAt: run.createdAt }));
        await store.persist?.();
        return { status: 501, body: { accepted: false, run, dispatch: { status: 'blocked', reply: summary } } };
      }

      const safeMessage = redactSensitiveText(message);
      recordRedactionAudit(store, 'run', 'Imbas OS Agent Console', targetAgent, message, safeMessage);
      const runId = createAgentDispatchRunId();
      const createdAt = new Date().toISOString();
      const dispatch = store.openclawDispatcher
        ? await store.openclawDispatcher.dispatch({ message: safeMessage, mode, agent: 'main' })
        : { status: 'blocked' as const, reply: 'OpenClaw dispatcher is not configured in this runtime.', transport: 'unconfigured' };
      const outcome = dispatch.status === 'completed' ? 'completed' as const : dispatch.status === 'blocked' ? 'blocked' as const : 'failed' as const;
      const safeReply = redactSensitiveText(dispatch.reply);
      recordRedactionAudit(store, 'run', 'OpenClaw', 'main', dispatch.reply, safeReply);
      const run = {
        connector: 'Imbas OS Agent Console',
        agent: 'OpenClaw',
        runId,
        task: safeMessage,
        outcome,
        summary: safeReply,
        verification: [`dispatch.status=${dispatch.status}`, `transport=${dispatch.transport ?? 'unknown'}`],
        artifacts: [dispatch.sessionId, dispatch.runId].filter(Boolean) as string[],
        createdAt
      };
      store.runs.push(run);
      store.runledger.push(createRunledgerEntry({ kind: 'run', connector: run.connector, agent: run.agent, title: `Agent Console dispatch: ${safeMessage.slice(0, 80)}`, outcome, summary: safeReply, refs: [runId, ...(run.artifacts ?? [])], createdAt }));
      store.modules.runledger = { ...store.modules.runledger, enabled: true, available: true, configured: true, health: outcome === 'completed' ? 'ok' : 'limited' };
      await store.persist?.();
      return { status: outcome === 'completed' ? 200 : 202, body: { accepted: true, run, dispatch: { ...dispatch, reply: safeReply } } };
    } catch (error) {
      return { status: 400, body: { errors: [error instanceof Error ? error.message : String(error)] } };
    }
  }

  if (request.method === 'POST' && path === '/v0/artifacts') {
    if (!store.vaultRoot) return { status: 400, body: { errors: ['vaultRoot is required for artifact writes'] } };
    try {
      const input = await readJson<CreateArtifactInput>(request);
      if (!input.html?.trim()) return { status: 400, body: { errors: ['html is required'] } };
      const safeInput = {
        ...input,
        html: redactSensitiveText(input.html),
        prompt: input.prompt ? redactSensitiveText(input.prompt) : input.prompt,
        sourceType: input.sourceType ?? 'generated'
      } satisfies CreateArtifactInput;
      const artifact = await createArtifact(store.vaultRoot, safeInput);
      store.runledger.push(createRunledgerEntry({ kind: 'event', connector: 'conduit', agent: 'artifact-api', title: `Saved artifact: ${artifact.metadata.title}`, outcome: 'accepted', summary: `Saved untrusted artifact ${artifact.metadata.id} through Conduit`, refs: [artifact.metadata.id] }));
      await store.persist?.();
      return { status: 202, body: { accepted: true, artifact } };
    } catch (error) {
      return { status: 400, body: { errors: [error instanceof Error ? error.message : String(error)] } };
    }
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
      const token = readBearerToken(request);
      const authedSession = token ? authenticateMobileSession(store.mobile, token, 'status.read') : null;
      if (!authedSession || authedSession.id !== mobileRevokeMatch[1]) return { status: 401, body: { errors: ['valid mobile session token is required to revoke this session'] } };
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


  const proposalPreviewMatch = path.match(/^\/v0\/wiki\/proposals\/([^/]+)\/preview$/);
  if (request.method === 'POST' && proposalPreviewMatch) {
    const proposal = store.lorekeeperProposals.find((item) => item.id === proposalPreviewMatch[1]);
    if (!proposal) return { status: 404, body: { error: 'proposal_not_found' } };
    if (!store.markdownRoot) return { status: 400, body: { errors: ['markdownRoot is required for Lorekeeper preview'] } };
    if (!proposal.targetPageId) return { status: 400, body: { errors: ['proposal targetPageId is required for Lorekeeper preview'] } };
    try {
      const page = await readMarkdownPageFromVault(store.markdownRoot, proposal.targetPageId);
      const approved = proposal.status === 'approved' ? proposal : transitionLorekeeperProposal(proposal, 'approved');
      const applied = applyLorekeeperProposalToMarkdown(page.markdown, approved);
      return { status: 200, body: { proposal, targetPage: page.node, blockId: applied.blockId, changed: applied.changed, before: page.markdown, after: applied.markdown } };
    } catch (error) {
      return { status: 400, body: { errors: [error instanceof Error ? error.message : String(error)] } };
    }
  }

  const proposalApplyMatch = path.match(/^\/v0\/wiki\/proposals\/([^/]+)\/apply$/);
  if (request.method === 'POST' && proposalApplyMatch) {
    const proposal = store.lorekeeperProposals.find((item) => item.id === proposalApplyMatch[1]);
    if (!proposal) return { status: 404, body: { error: 'proposal_not_found' } };
    if (!store.markdownRoot) return { status: 400, body: { errors: ['markdownRoot is required for Lorekeeper apply'] } };
    if (!proposal.targetPageId) return { status: 400, body: { errors: ['proposal targetPageId is required for Lorekeeper apply'] } };
    try {
      const page = await readMarkdownPageFromVault(store.markdownRoot, proposal.targetPageId);
      const beforeMarkdown = page.markdown;
      const applied = applyLorekeeperProposalToMarkdown(beforeMarkdown, proposal);
      const snapshot = applied.changed ? await createMarkdownSnapshot(store.markdownRoot, proposal.targetPageId, beforeMarkdown, `lorekeeper-${proposal.id}`) : undefined;
      const updated = applied.changed ? await updateMarkdownPage(store.markdownRoot, proposal.targetPageId, applied.markdown) : page;
      const next = transitionLorekeeperProposal(proposal, 'applied');
      store.lorekeeperProposals[store.lorekeeperProposals.indexOf(proposal)] = next;
      store.runledger.push(createRunledgerEntry({ kind: 'lorekeeper', connector: proposal.connector, agent: proposal.agent, title: `Applied ${proposal.title}`, outcome: 'applied', summary: `Applied Lorekeeper managed block ${applied.blockId} to ${proposal.targetPageId}`, refs: [proposal.id, proposal.targetPageId, ...(proposal.sources ?? [])] }));
      await store.persist?.();
      return { status: 200, body: { proposal: next, page: updated.node, blockId: applied.blockId, changed: applied.changed, snapshot: snapshot ?? { kind: 'markdown-before-apply', pageId: proposal.targetPageId, relativePath: page.node.relativePath, createdAt: new Date().toISOString(), markdown: beforeMarkdown } } };
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
    return { status: 200, body: { backend: 'conduit-local', task: body.task, items: results, totalItems: results.length, provenanceSummary: summarizeProvenance(results) } };
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



function createAgentDispatchRunId(): string {
  return `agent-dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function recordRedactionAudit(store: ConduitRecordStore, recordKind: 'event' | 'run', connector: string, agent: string, original: string, redacted: string): void {
  if (original === redacted) return;
  const handles = extractSensitiveHandles(original);
  const createdAt = new Date().toISOString();
  store.sanctumAudit.push({
    createdAt,
    action: 'redacted_input',
    recordKind,
    connector,
    agent,
    handles,
    rawSecretLikeContent: handles.length === 0
  });
  store.runledger.push(createRunledgerEntry({ kind: 'sanctum', connector, agent, title: `Redacted ${recordKind} input`, outcome: 'redacted', summary: handles.length ? `Redacted ${handles.length} Sanctum handle(s)` : 'Redacted raw secret-like content', refs: handles, createdAt }));
}

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
}

function localSearch(store: ConduitRecordStore, query: string, limit: number): unknown[] {
  const needle = query.toLowerCase();
  const now = Date.now();
  const withProvenance = <T extends { kind: string; index: number; createdAt?: string }>(item: T) => {
    const ageMs = item.createdAt ? Math.max(0, now - Date.parse(item.createdAt)) : null;
    const staleness = ageMs == null ? 'unknown' : ageMs < 1000 * 60 * 60 * 24 ? 'fresh' : ageMs < 1000 * 60 * 60 * 24 * 30 ? 'recent' : 'stale';
    return {
      ...item,
      provenance: [{
        uri: `conduit://${item.kind === 'lorekeeper_proposal' ? 'wiki/proposals' : item.kind === 'runledger' ? 'runledger' : `${item.kind}s`}/${item.index}`,
        kind: item.kind,
        label: item.kind.replaceAll('_', ' '),
        createdAt: item.createdAt,
        staleness,
        confidence: 'local-record'
      }]
    };
  };
  const events = store.events
    .map((event, index) => withProvenance({ kind: 'event', index, createdAt: event.createdAt, connector: event.connector, agent: event.agent, text: event.text, type: event.type, projectId: event.projectId, runId: event.runId }))
    .filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  const runs = store.runs
    .map((run, index) => withProvenance({ kind: 'run', index, createdAt: run.createdAt, connector: run.connector, agent: run.agent, runId: run.runId, task: run.task, summary: run.summary, outcome: run.outcome }))
    .filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  const ledger = store.runledger
    .map((entry, index) => withProvenance({ kind: 'runledger', index, createdAt: entry.createdAt, title: entry.title, summary: entry.summary, outcome: entry.outcome, refs: entry.refs }))
    .filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  const proposals = store.lorekeeperProposals
    .map((proposal, index) => withProvenance({ kind: 'lorekeeper_proposal', index, createdAt: proposal.createdAt, title: proposal.title, rationale: proposal.rationale, status: proposal.status, sources: proposal.sources, targetPageId: proposal.targetPageId }))
    .filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  return [...events, ...runs, ...ledger, ...proposals].slice(-limit).reverse();
}


function buildRunReplay(store: ConduitRecordStore, runId: string) {
  const runs = store.runs.filter((run) => run.runId === runId);
  const events = store.events.filter((event) => event.runId === runId || event.links?.some((link) => link.includes(runId)) || event.source?.uri?.includes(runId));
  const runledger = store.runledger.filter((entry) => entry.refs?.some((ref) => ref.includes(runId)) || entry.title.includes(runId) || entry.summary.includes(runId));
  const lorekeeperProposals = store.lorekeeperProposals.filter((proposal) => proposal.sources?.some((source) => source.includes(runId)) || proposal.rationale.includes(runId) || proposal.markdown.includes(runId));
  const sanctumAudit = store.sanctumAudit.filter((entry) => entry.connector === runs[0]?.connector || entry.agent === runs[0]?.agent || events.some((event) => event.connector === entry.connector && event.agent === entry.agent));
  const timeline = [
    ...runs.map((run) => ({ kind: 'run', createdAt: run.createdAt, title: run.task, outcome: run.outcome, summary: run.summary, record: run })),
    ...events.map((event, index) => ({ kind: 'event', createdAt: event.createdAt, title: event.type, outcome: event.visibility, summary: event.text, record: { ...event, index } })),
    ...runledger.map((entry) => ({ kind: 'runledger', createdAt: entry.createdAt, title: entry.title, outcome: entry.outcome, summary: entry.summary, record: entry })),
    ...lorekeeperProposals.map((proposal) => ({ kind: 'lorekeeper_proposal', createdAt: proposal.createdAt, title: proposal.title, outcome: proposal.status, summary: proposal.rationale, record: proposal })),
    ...sanctumAudit.map((entry) => ({ kind: 'sanctum', createdAt: entry.createdAt, title: entry.action, outcome: entry.recordKind, summary: entry.rawSecretLikeContent ? 'Redacted raw secret-like content' : `Redacted ${entry.handles.length} handle(s)`, record: entry }))
  ].sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
  return {
    runId,
    counts: { runs: runs.length, events: events.length, runledger: runledger.length, lorekeeperProposals: lorekeeperProposals.length, sanctumAudit: sanctumAudit.length, timeline: timeline.length },
    run: runs.at(-1) ?? null,
    timeline
  };
}

function summarizeProvenance(results: unknown[]) {
  const counts = new Map<string, number>();
  for (const result of results as { provenance?: { kind: string }[] }[]) {
    for (const item of result.provenance ?? []) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
  }
  return [...counts.entries()].map(([kind, count]) => ({ kind, count }));
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error('invalid JSON body');
  }
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
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
