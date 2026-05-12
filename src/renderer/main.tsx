import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import type { ArtifactGraph, ArtifactSnapshot, ArtifactSummary, SearchIndexStats, SyncStatus, TrustLevel, UnifiedSearchResult, VaultInfo, WikiBridgeReport, WikiPageBundle } from '../shared/types';
import './styles.css';

const MOBILE_DEFAULT_CONDUIT_URL = 'http://127.0.0.1:3077';

const defaultHtml = `<!doctype html>
<html>
<head><title>First artifact</title><style>body{font-family:system-ui;margin:2rem} .card{border:1px solid #ddd;border-radius:16px;padding:1rem;max-width:560px} button{padding:.6rem 1rem;border-radius:999px;border:0;background:#111;color:white}</style></head>
<body><div class="card"><h1>Hello artifact vault</h1><p>This is a self-contained HTML artifact rendered in a sandbox.</p><button onclick="document.querySelector('p').textContent='Interaction stayed inside the artifact.'">Try interaction</button></div></body>
</html>`;

function App() {
  const [activeView, setActiveView] = useState<'command' | 'agent' | 'vault'>('command');
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([]);
  const [unifiedResults, setUnifiedResults] = useState<UnifiedSearchResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWikiId, setSelectedWikiId] = useState<string | null>(null);
  const [html, setHtml] = useState(defaultHtml);
  const [title, setTitle] = useState('First artifact');
  const [markdownTitle, setMarkdownTitle] = useState('Project note');
  const [markdownDraft, setMarkdownDraft] = useState('# Project note\n\nLink artifacts with `[[artifact:artifact-id]]` or wiki pages with `[[Page Name]]`.');
  const [query, setQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [graph, setGraph] = useState<ArtifactGraph>({ nodes: [], edges: [] });
  const [wikiReport, setWikiReport] = useState<WikiBridgeReport | null>(null);
  const [indexStats, setIndexStats] = useState<SearchIndexStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [lastAction, setLastAction] = useState('Seed the demo vault or import an HTML artifact to begin.');
  const [importStatus, setImportStatus] = useState('Paste generated HTML below. New imports are copied into the local vault as untrusted artifacts.');
  const [conduitStatus, setConduitStatus] = useState<any>(null);
  const [aiWorldQuery, setAiWorldQuery] = useState('Imbas OS');
  const [aiWorldResult, setAiWorldResult] = useState<any>(null);
  const [mobilePairingChallenge, setMobilePairingChallenge] = useState<any>(null);
  const [mobilePairingQrDataUrl, setMobilePairingQrDataUrl] = useState('');
  const projectOptions = useMemo(() => [...new Set(graph.nodes.map((node) => node.project).filter(Boolean))].sort(), [graph.nodes]);
  const selected = useMemo(() => artifacts.find((artifact) => artifact.id === selectedId) ?? artifacts[0], [artifacts, selectedId]);
  const selectedWikiNode = useMemo(() => selectedWikiId ? graph.nodes.find((node) => node.id === selectedWikiId && node.kind === 'wiki') : null, [graph.nodes, selectedWikiId]);
  const totalArtifactCount = graph.nodes.filter((node) => node.kind !== 'wiki').length;
  const totalWikiCount = graph.nodes.filter((node) => node.kind === 'wiki').length;

  async function refresh() {
    setVault(await window.artifactVault.vaultInfo());
    const next = query.trim()
      ? indexStats ? await window.artifactVault.searchArtifactsIndexed(query) : await window.artifactVault.searchArtifacts(query)
      : await window.artifactVault.listArtifacts();
    const nextGraph = await window.artifactVault.artifactGraph();
    const filtered = projectFilter ? next.filter((artifact) => artifact.project === projectFilter) : next;
    const mixed = await window.artifactVault.searchUnified(query);
    const filteredMixed = projectFilter ? mixed.filter((item) => item.project === projectFilter) : mixed;
    setGraph(nextGraph);
    setArtifacts(filtered);
    setUnifiedResults(filteredMixed);
    setSyncStatus(await window.artifactVault.syncStatus());
    setConduitStatus(await window.artifactVault.conduitStatus());
    if (!selectedId && filtered[0]) setSelectedId(filtered[0].id);
  }

  useEffect(() => { void refresh(); }, [query, projectFilter, indexStats]);

  async function importArtifact(sample?: string) {
    const created = await window.artifactVault.createArtifact({ html: sample ?? html, title, sourceType: 'paste', tags: ['imported', 'paste'] });
    setIndexStats(null);
    await refresh();
    setSelectedId(created.metadata.id);
    setSelectedWikiId(null);
    setActiveView('vault');
    const message = `Imported ${created.metadata.title} as ${created.metadata.id}. Destination: ${created.metadata.bundlePath}. Trust level: ${created.metadata.trustLevel}.`;
    setImportStatus(message);
    setLastAction(`${message} It is rendered through the sandbox.`);
  }

  async function importHtmlFile() {
    const created = await window.artifactVault.importHtmlFile();
    if (!created) return;
    setIndexStats(null);
    await refresh();
    setSelectedId(created.metadata.id);
    setSelectedWikiId(null);
    setActiveView('vault');
    const message = `Imported ${created.metadata.title} from a local HTML file. Destination: ${created.metadata.bundlePath}. Trust level: ${created.metadata.trustLevel}.`;
    setImportStatus(message);
    setLastAction(`${message} Source-path provenance was preserved.`);
  }

  async function importBundleDirectory() {
    const created = await window.artifactVault.importBundleDirectory();
    if (!created) return;
    setIndexStats(null);
    await refresh();
    setSelectedId(created.metadata.id);
    setSelectedWikiId(null);
    setActiveView('vault');
    const message = `Imported portable bundle ${created.metadata.title}. Destination: ${created.metadata.bundlePath}. Trust level: ${created.metadata.trustLevel}.`;
    setImportStatus(message);
    setLastAction(`${message} It was copied into the local vault as a new artifact.`);
  }

  async function importMaliciousFixture() {
    const fixture = await window.artifactVault.loadMaliciousSample();
    setTitle('Malicious fixture');
    setHtml(fixture);
    await importArtifact(fixture);
  }

  async function seedDemoVault() {
    const next = await window.artifactVault.seedDemoVault();
    setArtifacts(next);
    setIndexStats(null);
    if (next[0]) setSelectedId(next[0].id);
    setLastAction('Seeded the demo vault: PR review, architecture map, decision matrix, compliance pack, learning quiz, incident timeline, and throwaway editor.');
  }

  async function rebuildSearchIndex() {
    setIndexStats(await window.artifactVault.rebuildSearchIndex());
    setLastAction('Rebuilt the SQLite FTS cache from filesystem artifact bundles. Bundles remain the source of truth.');
  }

  async function rebuildSyncManifest() {
    const manifest = await window.artifactVault.rebuildSyncManifest();
    setSyncStatus(await window.artifactVault.syncStatus());
    setConduitStatus(await window.artifactVault.conduitStatus());
    setLastAction(`Rebuilt sync manifest with ${manifest.entries.length} source files. Index caches were not treated as source of truth.`);
  }

  async function indexWikiDirectory() {
    const nextGraph = await window.artifactVault.indexWikiDirectory();
    if (!nextGraph) return;
    setGraph(nextGraph);
    setWikiReport(await window.artifactVault.wikiBridgeReport());
    setUnifiedResults(await window.artifactVault.searchUnified(query));
    const wikiCount = nextGraph.nodes.filter((node) => node.kind === 'wiki').length;
    setLastAction(`Indexed ${wikiCount} Markdown/wiki pages in read-only bridge mode. Source files were not rewritten.`);
  }


  async function searchAiWorld() {
    setAiWorldResult(await window.artifactVault.conduitSearch(aiWorldQuery));
  }

  async function buildAiWorldContextPack() {
    setAiWorldResult(await window.artifactVault.conduitContextPack(aiWorldQuery));
  }

  async function createMobilePairingChallenge() {
    const response = await window.artifactVault.conduitCreateMobilePairingChallenge({ ttlMs: 10 * 60 * 1000 });
    const challenge = response?.challenge ?? response;
    setMobilePairingChallenge(challenge);
    const payload = buildPairingPayload(challenge);
    setMobilePairingQrDataUrl(await QRCode.toDataURL(payload, { margin: 1, width: 220 }));
    setConduitStatus(await window.artifactVault.conduitStatus());
    setLastAction('Created a short-lived Android pairing challenge. Enter its challenge ID and code in the companion app.');
  }

  async function createVaultMarkdownPage() {
    const page = await window.artifactVault.createMarkdownPage({ title: markdownTitle, markdown: markdownDraft, tags: ['vault-owned'] });
    await refresh();
    setSelectedWikiId(page.node.id);
    setSelectedId(null);
    setLastAction(`Created vault-owned Markdown page ${page.node.relativePath}. It is editable inside Imbas OS.`);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>◈</span><div><p>local-first</p><h1>Imbas OS</h1></div></div>
        <nav className="primary-nav" aria-label="Imbas OS sections">
          <button className={activeView === 'command' ? 'active' : ''} onClick={() => setActiveView('command')}>Command Center</button>
          <button className={activeView === 'agent' ? 'active' : ''} onClick={() => setActiveView('agent')}>Agent Console</button>
          <button className={activeView === 'vault' ? 'active' : ''} onClick={() => setActiveView('vault')}>Artifact Vault</button>
        </nav>
        <div className="vault-card">
          <strong>Vault</strong>
          <code>{vault?.root ?? 'loading…'}</code>
          <span>{artifacts.length} artifacts shown · {totalArtifactCount} artifacts · {totalWikiCount} markdown pages</span>
        </div>
        <section className="tour-panel">
          <p className="eyebrow">60-second tour</p>
          <ol>
            <li><strong>Capture</strong> generated HTML by paste or file import.</li>
            <li><strong>Replay</strong> it in a sandboxed <code>artifact://</code> viewer with network denied.</li>
            <li><strong>Organize</strong> with project metadata, notes, snapshots, search, and backlinks.</li>
            <li><strong>Export</strong> Markdown, JSON, or a prompt package for the next AI pass.</li>
          </ol>
          <p className="muted">{lastAction}</p>
        </section>
        <section className="import-panel">
          <div>
            <p className="eyebrow">capture</p>
            <h2>Import / paste HTML</h2>
            <p className="muted">Destination: <code>{vault?.root ? `${vault.root}/artifacts/…` : 'loading vault path…'}</code></p>
            <p className="muted">Default trust: <code>untrusted</code> · replay opens in the sandbox immediately after import.</p>
          </div>
          <label>Artifact title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Paste generated HTML<textarea value={html} onChange={(event) => setHtml(event.target.value)} /></label>
          <button onClick={() => importArtifact()} disabled={!html.trim()}>Import pasted HTML</button>
          <div className="button-row compact"><button className="secondary" onClick={importHtmlFile}>Import .html file</button><button className="secondary" onClick={importBundleDirectory}>Import bundle folder</button></div>
          <div className="button-row compact"><button className="secondary" onClick={importMaliciousFixture}>Import malicious fixture</button><button className="secondary" onClick={seedDemoVault}>Seed demo vault</button></div>
          <p className="import-status">{importStatus}</p>
        </section>
        <section className="import-panel">
          <h2>Create Markdown</h2>
          <label>Title<input value={markdownTitle} onChange={(event) => setMarkdownTitle(event.target.value)} /></label>
          <label>Markdown<textarea value={markdownDraft} onChange={(event) => setMarkdownDraft(event.target.value)} /></label>
          <button className="secondary" onClick={createVaultMarkdownPage}>Create vault-owned page</button>
        </section>
        <section className="library">
          <div className="section-heading"><h2>Library</h2><span>{indexStats ? 'indexed' : 'filesystem scan'}</span></div>
          <input placeholder="Search title, tags, notes, prompt, HTML…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="">All projects</option>{projectOptions.map((project) => <option key={project} value={project}>{project}</option>)}</select>
          <button className="secondary" onClick={rebuildSearchIndex}>{indexStats ? `Index rebuilt: ${indexStats.artifactCount} artifacts` : 'Rebuild SQLite search index'}</button>
          {unifiedResults.map((item) => <button key={item.id} className={(item.kind === 'artifact' && item.id === selectedId) || item.id === selectedWikiId ? 'artifact-row active' : 'artifact-row'} onClick={() => { if (item.kind === 'artifact') { setSelectedId(item.id); setSelectedWikiId(null); } else { setSelectedWikiId(item.id); setSelectedId(null); } }}><strong>{item.kind === 'wiki' ? '◇ ' : ''}{item.title}</strong><span>{item.kind === 'wiki' ? `${item.sourceOwnership} · ${item.relativePath}` : `${item.project || 'No project'} · ${item.trustLevel}`} · {item.tags.join(', ') || 'untagged'}</span>{item.createdAt && <small>{new Date(item.createdAt).toLocaleString()}</small>}<em>matched {item.matchReason}</em></button>)}
          {!unifiedResults.length && <div className="empty-card"><strong>No vault items yet</strong><p className="muted">Seed the demo vault, import HTML, or index a Markdown/wiki folder in read-only bridge mode.</p></div>}
        </section>
        <section className="graph-panel">
          <h2>Graph</h2>
          <p className="muted">{graph.nodes.length} nodes · {graph.edges.length} explicit links · {graph.nodes.filter((node) => node.kind === 'wiki').length} wiki pages</p>
          <button className="secondary" onClick={indexWikiDirectory}>Index wiki folder</button>
          <GraphCanvas graph={graph} />
          <WikiBridgeReportCard report={wikiReport} />
          {graph.edges.slice(0, 5).map((edge) => <p key={`${edge.from}-${edge.to}`}><code>{labelFor(graph, edge.from)}</code> → <code>{labelFor(graph, edge.to)}</code></p>)}
        </section>

        <section className="graph-panel ai-world-panel">
          <h2>AI world</h2>
          <p className="muted">Conduit sees {conduitStatus?.counts?.events ?? 0} events · {conduitStatus?.counts?.runs ?? 0} runs</p>
          <p className="muted">Runledger: {conduitStatus?.counts?.runledger ?? 0} · Lorekeeper proposals: {conduitStatus?.counts?.lorekeeperProposals ?? 0}</p>
          <p className="muted">Sanctum redactions: {conduitStatus?.sanctumAudit?.length ?? 0}</p>
          <p className="muted">Memsocket: <code>{conduitStatus?.modules?.memsocket?.health ?? 'loading'}</code></p>
          <input placeholder="Search the agent world…" value={aiWorldQuery} onChange={(event) => setAiWorldQuery(event.target.value)} />
          <button className="secondary" onClick={searchAiWorld}>Search Conduit</button>
          <button className="secondary" onClick={buildAiWorldContextPack}>Context pack</button>
          <div className="bridge-report">
            {(conduitStatus?.recentRuns ?? []).slice(0, 3).map((run: any) => <em key={run.runId}>{run.outcome}: {run.task}</em>)}
            {(conduitStatus?.recentRunledger ?? []).slice(0, 3).map((entry: any) => <em key={entry.id}>Ledger {entry.outcome}: {entry.title}</em>)}
            {(conduitStatus?.recentLorekeeperProposals ?? []).slice(0, 3).map((proposal: any) => <em key={proposal.id}>Lorekeeper {proposal.status}: {proposal.title}{proposal.targetPageId ? ` → ${proposal.targetPageId}` : ''}</em>)}
            {(conduitStatus?.recentEvents ?? []).slice(0, 3).map((event: any, index: number) => <em key={`${event.createdAt}-${index}`}>{event.type}: {event.text.slice(0, 90)}</em>)}
            {(conduitStatus?.sanctumAudit ?? []).slice(0, 3).map((entry: any, index: number) => <em key={`${entry.createdAt}-${index}`}>Sanctum {entry.action}: {entry.recordKind} from {entry.connector}</em>)}
            {aiWorldResult && <pre>{JSON.stringify(aiWorldResult, null, 2).slice(0, 1200)}</pre>}
          </div>
        </section>

        <section className="graph-panel">
          <h2>Sync foundation</h2>
          <p className="muted">Node <code>{syncStatus?.localNode.id.slice(0, 8) ?? 'loading'}</code> · {syncStatus?.trackedFiles ?? 0} tracked files</p>
          <p className="muted">Manifest: {syncStatus?.manifestGeneratedAt ? new Date(syncStatus.manifestGeneratedAt).toLocaleString() : 'not built yet'}</p>
          <p className="muted">{syncStatus?.changedFiles.length ?? 0} local changes · {syncStatus?.conflictCandidates.length ?? 0} conflict candidates</p>
          <button className="secondary" onClick={rebuildSyncManifest}>Rebuild sync manifest</button>
          {(syncStatus?.conflictCandidates.length ?? 0) > 0 && <div className="bridge-report">{syncStatus!.conflictCandidates.slice(0, 4).map((item) => <em key={item.path}>{item.reason}: {item.path}</em>)}</div>}
        </section>
      </aside>
      <section className="workspace">
        {activeView === 'command'
          ? <CommandCenter vault={vault} artifacts={artifacts} graph={graph} syncStatus={syncStatus} conduitStatus={conduitStatus} mobilePairingChallenge={mobilePairingChallenge} mobilePairingQrDataUrl={mobilePairingQrDataUrl} onCreateMobilePairingChallenge={createMobilePairingChallenge} onSeedDemoVault={seedDemoVault} onRebuildSyncManifest={rebuildSyncManifest} onOpenVault={() => setActiveView('vault')} />
          : activeView === 'agent'
            ? <AgentConsole conduitStatus={conduitStatus} onSearchConduit={window.artifactVault.conduitSearch} onBuildContextPack={window.artifactVault.conduitContextPack} onDispatchOpenClaw={window.artifactVault.conduitOpenClawDispatch} onRunReplay={window.artifactVault.conduitRunReplay} onCreateLorekeeperProposal={window.artifactVault.conduitCreateLorekeeperProposal} onPreviewLorekeeperProposal={window.artifactVault.conduitPreviewLorekeeperProposal} onApproveLorekeeperProposal={window.artifactVault.conduitApproveLorekeeperProposal} onRejectLorekeeperProposal={window.artifactVault.conduitRejectLorekeeperProposal} onApplyLorekeeperProposal={window.artifactVault.conduitApplyLorekeeperProposal} onListLorekeeperSnapshots={window.artifactVault.conduitListLorekeeperSnapshots} onPreviewLorekeeperSnapshot={window.artifactVault.conduitPreviewLorekeeperSnapshot} onRestoreLorekeeperSnapshot={window.artifactVault.conduitRestoreLorekeeperSnapshot} onCreateArtifact={async (input) => { const artifact = await window.artifactVault.createArtifact(input); setIndexStats(null); await refresh(); setSelectedId(artifact.metadata.id); setSelectedWikiId(null); setActiveView('vault'); }} />
            : selectedWikiId && selectedWikiNode ? <MarkdownDetail pageId={selectedWikiId} graph={graph} onRefresh={refresh} /> : selected ? <ArtifactDetail artifact={selected} graph={graph} onRefresh={refresh} onIndexDirty={() => setIndexStats(null)} /> : <EmptyState />}
      </section>
    </main>
  );
}


function CommandCenter({ vault, artifacts, graph, syncStatus, conduitStatus, mobilePairingChallenge, onCreateMobilePairingChallenge, onSeedDemoVault, onRebuildSyncManifest, onOpenVault }: { vault: VaultInfo | null; artifacts: ArtifactSummary[]; graph: ArtifactGraph; syncStatus: SyncStatus | null; conduitStatus: any; mobilePairingChallenge: any; onCreateMobilePairingChallenge: () => Promise<void>; onSeedDemoVault: () => Promise<void>; onRebuildSyncManifest: () => Promise<void>; onOpenVault: () => void }) {
  const moduleEntries = Object.entries(conduitStatus?.modules ?? {}) as [string, any][];
  const recentRuns = (conduitStatus?.recentRunledger ?? conduitStatus?.recentRuns ?? []).slice(0, 5);
  const proposals = (conduitStatus?.recentLorekeeperProposals ?? []).slice(0, 4);
  const activeSessions = conduitStatus?.mobile?.activeSessions ?? [];
  const totalWikiCount = graph.nodes.filter((node) => node.kind === 'wiki').length;

  return <div className="command-center">
    <header className="hero-card">
      <p className="eyebrow">HTML Artifact Vault alpha</p>
      <h2>Save generated HTML, replay it safely, keep the context.</h2>
      <p>Start here: Imbas OS is launching with Artifact Vault first — a local vault for AI-made dashboards, reports, mini-tools, lessons, and other self-contained HTML outputs.</p>
      <div className="hero-actions">
        <button onClick={onOpenVault}>Open Artifact Vault</button>
        <button className="secondary" onClick={onSeedDemoVault}>Seed demo workbench</button>
        <button className="secondary" onClick={onRebuildSyncManifest}>Rebuild sync manifest</button>
        <button className="secondary" onClick={onCreateMobilePairingChallenge}>Create Android pairing code</button>
      </div>
    </header>

    {artifacts.length === 0 && <section className="onboarding-panel" aria-labelledby="first-run-title">
      <div>
        <p className="eyebrow">first run</p>
        <h3 id="first-run-title">Your vault is empty. Try the 60-second loop.</h3>
        <p>Seed the demo workbench or import/paste generated HTML from the sidebar. Every artifact is copied into your local vault, starts as <code>untrusted</code>, and replays through the sandboxed <code>artifact://</code> viewer.</p>
      </div>
      <ol className="onboarding-steps">
        <li><strong>Capture</strong><span>Paste HTML, import a file, or seed realistic demo artifacts.</span></li>
        <li><strong>Replay safely</strong><span>Generated HTML gets scripts but no Node bridge and no artifact-origin network by default.</span></li>
        <li><strong>Preserve context</strong><span>Add metadata, notes, provenance, snapshots, search terms, and AI handoff exports.</span></li>
      </ol>
      <div className="hero-actions">
        <button onClick={onSeedDemoVault}>Seed demo workbench</button>
        <button className="secondary" onClick={onOpenVault}>Go to import panel</button>
      </div>
      <p className="muted">Vault location: <code>{vault?.root ?? 'loading…'}</code></p>
    </section>}

    <section className="metric-grid">
      <MetricCard label="Artifacts" value={String(vault?.artifactCount ?? artifacts.length)} detail={`${artifacts.length} currently shown`} />
      <MetricCard label="Markdown/wiki" value={String(totalWikiCount)} detail="vault-owned or bridged pages" />
      <MetricCard label="Runs" value={String(conduitStatus?.counts?.runledger ?? conduitStatus?.counts?.runs ?? 0)} detail="Runledger entries / agent runs" />
      <MetricCard label="Approvals" value={String(proposals.filter((proposal: any) => proposal.status === 'proposed').length)} detail="Lorekeeper proposals pending" />
      <MetricCard label="Mobile" value={String(activeSessions.length)} detail={`${conduitStatus?.mobile?.pendingPairingChallenges ?? 0} pending pairing challenge(s)`} />
      <MetricCard label="Sync" value={String(syncStatus?.trackedFiles ?? 0)} detail={`${syncStatus?.changedFiles.length ?? 0} local changes`} />
    </section>

    <section className="command-grid">
      <Panel title="Module health" eyebrow="capabilities">
        {moduleEntries.length ? moduleEntries.map(([name, module]) => <div className="module-row" key={name}>
          <span>{name}</span>
          <strong className={`health health-${module.health ?? 'unknown'}`}>{module.health ?? 'unknown'}</strong>
          <em>{module.enabled ? 'enabled' : module.available ? 'available' : 'not available'}</em>
        </div>) : <p className="muted">Conduit module status is loading.</p>}
      </Panel>

      <Panel title="Recent work" eyebrow="runledger">
        {recentRuns.length ? recentRuns.map((run: any) => <article className="timeline-item" key={run.id ?? run.runId ?? run.createdAt}>
          <strong>{run.title ?? run.task}</strong>
          <span>{run.outcome ?? run.status} · {run.connector ?? 'conduit'} / {run.agent ?? 'agent'}</span>
          <p>{run.summary ?? run.task}</p>
        </article>) : <p className="muted">No runs recorded yet. The OpenClaw dogfood connector will start filling this in.</p>}
      </Panel>

      <Panel title="Lorekeeper proposals" eyebrow="review queue">
        {proposals.length ? proposals.map((proposal: any) => <article className="timeline-item" key={proposal.id}>
          <strong>{proposal.title}</strong>
          <span>{proposal.status}{proposal.targetPageId ? ` → ${proposal.targetPageId}` : ''}</span>
          <p>{proposal.rationale}</p>
        </article>) : <p className="muted">No proposals yet. Agents will propose wiki/memory updates here before durable changes.</p>}
      </Panel>



      <Panel title="Android pairing" eyebrow="mobile companion">
        <p className="muted">Create a 10-minute challenge here, then scan the QR code from the Android companion Pair tab or enter the challenge manually.</p>
        {mobilePairingChallenge ? <div className="pairing-challenge-card">
          <span>Challenge ID</span><code>{mobilePairingChallenge.id}</code>
          <span>Code</span><strong>{mobilePairingChallenge.code}</strong>
          <em>Expires {mobilePairingChallenge.expiresAt ? new Date(mobilePairingChallenge.expiresAt).toLocaleTimeString() : 'soon'}</em>
          {mobilePairingQrDataUrl && <img className="pairing-qr" src={mobilePairingQrDataUrl} alt="Android pairing QR code" />}
          <small>Payload includes the challenge, code, and default tailnet Conduit URL.</small>
        </div> : <p className="muted">No active challenge created in this UI session.</p>}
        <button className="secondary" onClick={onCreateMobilePairingChallenge}>Create new pairing challenge</button>
        {activeSessions.length ? activeSessions.map((session: any) => <article className="timeline-item" key={session.id}><strong>{session.deviceLabel}</strong><span>{session.scopes?.join(', ')}</span><p>{session.id}</p></article>) : <p className="muted">No active companion sessions yet.</p>}
      </Panel>

      <Panel title="Migration posture" eyebrow="memory">
        <div className="migration-steps">
          <span className="done">1 Dogfood bridge</span>
          <span>2 Dual write</span>
          <span>3 Prefer Imbas packs</span>
          <span>4 Retire MemPalace after approval</span>
        </div>
        <p className="muted">MemPalace remains the working safety net until Imbas/Memsocket passes the documented migration criteria.</p>
      </Panel>
    </section>
  </div>;
}


function buildPairingPayload(challenge: any) {
  const params = new URLSearchParams({
    serviceUrl: MOBILE_DEFAULT_CONDUIT_URL,
    challengeId: challenge?.id ?? '',
    code: challenge?.code ?? ''
  });
  return `imbas://pair?${params.toString()}`;
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="metric-card"><span>{label}</span><strong>{value}</strong><p>{detail}</p></div>;
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <section className="command-panel"><p className="eyebrow">{eyebrow}</p><h3>{title}</h3>{children}</section>;
}


type ConsoleMessage = { role: 'human' | 'agent' | 'system'; text: string; createdAt: string };

type ConsoleDispatchSummary = {
  agent: string;
  mode: 'chat' | 'task';
  runId: string;
  title: string;
  outcome: string;
  transport: string;
  request: string;
  reply: string;
  sessionRef?: string;
};

function summarizeDispatch(response: any, human: ConsoleMessage, agentMessage: ConsoleMessage, agent: string, mode: 'chat' | 'task'): ConsoleDispatchSummary {
  const run = response?.run ?? {};
  const dispatch = response?.dispatch ?? {};
  return {
    agent,
    mode,
    runId: run.runId ?? `agent-dispatch-${Date.now()}`,
    title: human.text.slice(0, 96) || 'Untitled dispatch',
    outcome: run.outcome ?? dispatch.status ?? 'unknown',
    transport: dispatch.transport ?? run.verification?.find?.((item: string) => item.startsWith('transport='))?.replace('transport=', '') ?? 'unknown',
    request: run.task ?? human.text,
    reply: dispatch.reply ?? run.summary ?? agentMessage.text,
    sessionRef: dispatch.sessionId ?? dispatch.runId ?? run.artifacts?.[0]
  };
}

function AgentConsole({ conduitStatus, onSearchConduit, onBuildContextPack, onDispatchOpenClaw, onRunReplay, onCreateLorekeeperProposal, onPreviewLorekeeperProposal, onApproveLorekeeperProposal, onRejectLorekeeperProposal, onApplyLorekeeperProposal, onListLorekeeperSnapshots, onPreviewLorekeeperSnapshot, onRestoreLorekeeperSnapshot, onCreateArtifact }: { conduitStatus: any; onSearchConduit: (query: string) => Promise<any>; onBuildContextPack: (task: string) => Promise<any>; onDispatchOpenClaw: (input: { message: string; mode?: 'chat' | 'task'; agent?: string }) => Promise<any>; onRunReplay: (runId: string) => Promise<any>; onCreateLorekeeperProposal: (input: any) => Promise<any>; onPreviewLorekeeperProposal: (id: string) => Promise<any>; onApproveLorekeeperProposal: (id: string) => Promise<any>; onRejectLorekeeperProposal: (id: string) => Promise<any>; onApplyLorekeeperProposal: (id: string) => Promise<any>; onListLorekeeperSnapshots: (targetPageId: string) => Promise<any>; onPreviewLorekeeperSnapshot: (input: { targetPageId: string; snapshotPath: string }) => Promise<any>; onRestoreLorekeeperSnapshot: (input: { targetPageId: string; snapshotPath: string; confirm: string }) => Promise<any>; onCreateArtifact: (input: CreateArtifactInput) => Promise<void> }) {
  const [agent, setAgent] = useState('OpenClaw');
  const [mode, setMode] = useState<'chat' | 'task'>('chat');
  const [message, setMessage] = useState('Summarize the current Imbas OS state and suggest the next safe task.');
  const [messages, setMessages] = useState<ConsoleMessage[]>([
    { role: 'system', text: 'Agent Console v0.2 can dispatch to OpenClaw through a constrained local adapter, record the request/reply in Runledger, and still build context packs or save transcript artifacts.', createdAt: new Date().toISOString() }
  ]);
  const [result, setResult] = useState<any>(null);
  const [runReplayId, setRunReplayId] = useState('');
  const [proposalTargetPageId, setProposalTargetPageId] = useState('');
  const [proposalPreview, setProposalPreview] = useState<any>(null);
  const [selectedProposalId, setSelectedProposalId] = useState('');
  const [proposalStatuses, setProposalStatuses] = useState<Record<string, string>>({});
  const [markdownSnapshots, setMarkdownSnapshots] = useState<any[]>([]);
  const [snapshotPreview, setSnapshotPreview] = useState<any>(null);
  const [snapshotRestoreConfirm, setSnapshotRestoreConfirm] = useState('');
  const [lastDispatch, setLastDispatch] = useState<ConsoleDispatchSummary | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [actionStatus, setActionStatus] = useState('Ready.');

  async function sendMessage() {
    if (!message.trim() || isDispatching) return;
    const createdAt = new Date().toISOString();
    const human = { role: 'human' as const, text: message.trim(), createdAt };
    setMessages((current) => [...current, human]);
    setIsDispatching(true);
    setActionStatus(`Dispatching to ${agent}…`);
    try {
      const response = await onDispatchOpenClaw({ message: human.text, mode, agent });
      setResult(response);
      const agentText = response?.dispatch?.reply
        ?? response?.run?.summary
        ?? `${agent} dispatch returned without a displayable reply.`;
      const agentMessage = { role: 'agent' as const, text: agentText, createdAt: new Date().toISOString() };
      setMessages((current) => [...current, agentMessage]);
      const summary = summarizeDispatch(response, human, agentMessage, agent, mode);
      setLastDispatch(summary);
      setRunReplayId(summary.runId);
      setActionStatus(summary.outcome === 'completed' ? `Completed via ${summary.transport}. Run ${summary.runId} is ready for replay or promotion.` : `${summary.outcome}: ${agentText.slice(0, 140)}`);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setMessages((current) => [...current, { role: 'system', text: `Dispatch failed: ${text}`, createdAt: new Date().toISOString() }]);
      setActionStatus(`Dispatch failed: ${text}`);
    } finally {
      setIsDispatching(false);
    }
  }

  async function saveTranscriptArtifact() {
    setActionStatus('Saving transcript artifact…');
    const transcriptHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Agent Console transcript</title><style>body{font-family:system-ui;margin:2rem;line-height:1.5}.msg{border:1px solid #ddd;border-radius:12px;padding:1rem;margin:1rem 0}.system{background:#f6f6f6}.human{background:#eef6ff}.agent{background:#effaf3}pre{white-space:pre-wrap;background:#111;color:#eee;padding:1rem;border-radius:12px}</style></head><body><h1>Agent Console transcript</h1><p>Agent: ${escapeHtml(agent)} · Mode: ${escapeHtml(mode)}</p>${messages.map((item) => `<section class="msg ${item.role}"><strong>${item.role}</strong><p>${escapeHtml(item.text)}</p><small>${item.createdAt}</small></section>`).join('')}<h2>Last Conduit result</h2><pre>${escapeHtml(JSON.stringify(result ?? {}, null, 2))}</pre></body></html>`;
    await onCreateArtifact({ html: transcriptHtml, title: `Agent Console transcript — ${agent}`, sourceType: 'generated', provider: 'Imbas OS', model: 'agent-console-v0', project: 'Imbas OS', tags: ['agent-console', 'transcript'] });
    setActionStatus('Saved transcript as an Artifact Vault artifact.');
  }


  async function saveLastReplyArtifact() {
    if (!lastDispatch) return;
    setActionStatus('Saving latest reply artifact…');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Agent reply — ${escapeHtml(lastDispatch.agent)}</title><style>body{font-family:system-ui;margin:2rem;line-height:1.55;max-width:900px}.meta{color:#666}.card{border:1px solid #ddd;border-radius:14px;padding:1rem;margin:1rem 0}pre{white-space:pre-wrap;background:#111;color:#eee;padding:1rem;border-radius:12px}</style></head><body><h1>Agent reply</h1><p class="meta">${escapeHtml(lastDispatch.agent)} · ${escapeHtml(lastDispatch.mode)} · ${escapeHtml(lastDispatch.outcome)} · ${escapeHtml(lastDispatch.transport)}</p><section class="card"><h2>Request</h2><pre>${escapeHtml(lastDispatch.request)}</pre></section><section class="card"><h2>Reply</h2><pre>${escapeHtml(lastDispatch.reply)}</pre></section><p class="meta">Runledger ref: ${escapeHtml(lastDispatch.runId)}</p></body></html>`;
    await onCreateArtifact({ html, title: `Agent reply — ${lastDispatch.agent}`, sourceType: 'generated', provider: 'Imbas OS', model: 'agent-console-v0.2', project: 'Imbas OS', tags: ['agent-console', 'agent-reply', lastDispatch.outcome] });
    setActionStatus('Saved latest reply as an Artifact Vault artifact.');
  }

  async function createLorekeeperProposalFromLastReply() {
    if (!lastDispatch) return;
    setActionStatus('Creating Lorekeeper proposal from latest reply…');
    const response = await onCreateLorekeeperProposal({
      title: `Agent reply note — ${lastDispatch.agent}`,
      markdown: `## ${lastDispatch.agent} reply\n\n**Request:** ${lastDispatch.request}\n\n**Reply:**\n\n${lastDispatch.reply}`,
      rationale: 'Promote the latest Agent Console reply into reviewable durable wiki knowledge.',
      connector: 'Imbas OS',
      agent: 'agent-console',
      targetPageId: proposalTargetPageId.trim() || undefined,
      sources: [`imbas://runledger/${lastDispatch.runId}`, ...(lastDispatch.sessionRef ? [`openclaw://sessions/${lastDispatch.sessionRef}`] : [])]
    });
    setResult(response);
    setActionStatus('Created Lorekeeper proposal from latest reply.');
  }

  async function replayLastDispatch() {
    if (!lastDispatch) return;
    setActionStatus(`Replaying ${lastDispatch.runId}…`);
    const replay = await onRunReplay(lastDispatch.runId);
    setResult(replay);
    setActionStatus(`Loaded replay timeline for ${lastDispatch.runId}.`);
  }

  async function contextPackForLastDispatch() {
    if (!lastDispatch) return;
    setActionStatus('Building context pack for latest exchange…');
    const pack = await onBuildContextPack(`${lastDispatch.request}\n\n${lastDispatch.reply}`);
    setResult(pack);
    setActionStatus(`Built context pack with ${pack?.totalItems ?? pack?.items?.length ?? 0} item(s).`);
  }

  async function createLorekeeperProposalFromTranscript() {
    setActionStatus('Creating Lorekeeper proposal from full transcript…');
    const markdown = messages.map((item) => `- **${item.role}** (${item.createdAt}): ${item.text}`).join('\n');
    const response = await onCreateLorekeeperProposal({
      title: `Agent Console note — ${agent}`,
      markdown,
      rationale: 'User-staged Agent Console transcript should be reviewed before durable wiki apply.',
      connector: 'Imbas OS',
      agent: 'agent-console',
      targetPageId: proposalTargetPageId.trim() || undefined,
      sources: ['imbas://agent-console/transcript']
    });
    setResult(response);
    setActionStatus('Created Lorekeeper proposal from full transcript.');
  }

  async function replayRun() {
    if (!runReplayId.trim()) return;
    const replay = await onRunReplay(runReplayId.trim());
    setResult(replay);
    setActionStatus(`Loaded replay timeline for ${runReplayId.trim()}.`);
  }

  async function previewProposal(id: string) {
    const preview = await onPreviewLorekeeperProposal(id);
    setSelectedProposalId(id);
    setProposalPreview(preview);
    if (preview?.proposal?.targetPageId) {
      const snapshots = await onListLorekeeperSnapshots(preview.proposal.targetPageId);
      setMarkdownSnapshots(snapshots?.snapshots ?? []);
    }
    setResult(preview);
    setActionStatus(`Previewed proposal ${id}.`);
  }

  async function transitionProposal(id: string, action: 'approve' | 'reject' | 'apply') {
    const response = action === 'approve' ? await onApproveLorekeeperProposal(id) : action === 'reject' ? await onRejectLorekeeperProposal(id) : await onApplyLorekeeperProposal(id);
    setResult(response);
    const nextStatus = response?.proposal?.status ?? (action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'applied');
    setProposalStatuses((current) => ({ ...current, [id]: nextStatus }));
    if (action !== 'reject') {
      try {
        const preview = await onPreviewLorekeeperProposal(id);
        setSelectedProposalId(id);
        setProposalPreview(preview);
        if (preview?.proposal?.targetPageId) {
          const snapshots = await onListLorekeeperSnapshots(preview.proposal.targetPageId);
          setMarkdownSnapshots(snapshots?.snapshots ?? []);
        }
      } catch {
        if (action === 'apply') setProposalPreview(null);
      }
    }
    setActionStatus(`${action} proposal ${id}.`);
  }

  return <div className="agent-console">
    <header className="hero-card compact">
      <p className="eyebrow">agent console v0.2</p>
      <h2>Chat with agents, stage tasks, and turn useful replies into durable Imbas OS records.</h2>
      <p>OpenClaw dispatch is live through a local constrained adapter. Requests and replies are written into Runledger so they can be replayed, reviewed, and turned into artifacts or Lorekeeper proposals.</p>
    </header>
    <div className="console-layout">
      <section className="chat-panel">
        <div className="console-toolbar">
          <label>Agent<select value={agent} onChange={(event) => setAgent(event.target.value)}><option>OpenClaw</option><option>Hermes</option><option>Codex</option><option>Claude Code</option><option>Auto-route</option></select></label>
          <label>Mode<select value={mode} onChange={(event) => setMode(event.target.value as 'chat' | 'task')}><option value="chat">Chat / ask</option><option value="task">Task / context pack</option></select></label>
        </div>
        <div className="message-list">
          {messages.map((item, index) => <article className={`message ${item.role}`} key={`${item.createdAt}-${index}`}><strong>{item.role}</strong><p>{item.text}</p><span>{new Date(item.createdAt).toLocaleTimeString()}</span></article>)}
        </div>
        <label>Message<textarea className="prompt-editor console-input" value={message} onChange={(event) => setMessage(event.target.value)} /></label>
        <div className="button-row"><button onClick={sendMessage} disabled={isDispatching || !message.trim()}>{isDispatching ? 'Dispatching…' : `Dispatch to ${agent}`}</button><button className="secondary" onClick={async () => { setActionStatus('Searching Conduit…'); const next = mode === 'task' ? await onBuildContextPack(message) : await onSearchConduit(message); setResult(next); setActionStatus('Loaded search/context-only result.'); }}>Search/context only</button><button className="secondary" onClick={saveTranscriptArtifact}>Save full transcript</button><button className="secondary" onClick={createLorekeeperProposalFromTranscript}>Propose full transcript</button></div>
        <p className="action-status" aria-live="polite">{actionStatus}</p>
        {lastDispatch && <section className="reply-action-card" aria-label="Latest dispatch actions">
          <div className="section-heading"><div><p className="eyebrow">latest dispatch</p><h3>{lastDispatch.outcome}: {lastDispatch.title}</h3></div><span className={`health health-${lastDispatch.outcome === 'completed' ? 'ok' : 'limited'}`}>{lastDispatch.transport}</span></div>
          <p className="muted">Run <code>{lastDispatch.runId}</code>{lastDispatch.sessionRef ? <> · session <code>{lastDispatch.sessionRef}</code></> : null}</p>
          <p>{lastDispatch.reply.slice(0, 360)}{lastDispatch.reply.length > 360 ? '…' : ''}</p>
          <div className="button-row"><button className="secondary" onClick={replayLastDispatch}>Replay Runledger</button><button className="secondary" onClick={saveLastReplyArtifact}>Save reply artifact</button><button className="secondary" onClick={createLorekeeperProposalFromLastReply}>Propose reply note</button><button className="secondary" onClick={contextPackForLastDispatch}>Build context pack</button></div>
        </section>}
      </section>
      <aside className="metadata-panel console-side">
        <details open><summary>Connector readiness</summary>
          <p className="muted">OpenClaw is the live private-preview target. Hermes, Codex, and Claude Code stay blocked/staged until their adapters have the same Runledger and approval boundaries.</p>
          <dl><dt>Conduit status</dt><dd>{conduitStatus?.status ?? 'loading'}</dd><dt>Runs</dt><dd>{conduitStatus?.counts?.runs ?? 0}</dd><dt>Events</dt><dd>{conduitStatus?.counts?.events ?? 0}</dd><dt>Lorekeeper proposals</dt><dd>{conduitStatus?.counts?.lorekeeperProposals ?? 0}</dd></dl>
        </details>
        <details open><summary>Action cards</summary>
          <label>Run replay ID<input value={runReplayId} onChange={(event) => setRunReplayId(event.target.value)} placeholder="runId from Conduit" /></label>
          <button className="secondary" onClick={replayRun}>Replay run timeline</button>
          <label>Lorekeeper target page<input value={proposalTargetPageId} onChange={(event) => setProposalTargetPageId(event.target.value)} placeholder="optional wiki:pages/name.md" /></label>
          {(conduitStatus?.recentLorekeeperProposals ?? []).slice(0, 4).map((proposal: any) => { const status = proposalStatuses[proposal.id] ?? proposal.status; return <div className={`action-card ${selectedProposalId === proposal.id ? 'selected' : ''}`} key={proposal.id}><strong>{proposal.title}</strong><span>{status}{proposal.targetPageId ? ` → ${proposal.targetPageId}` : ''}</span><p className="muted">{proposal.rationale}</p><div className="button-row"><button className="secondary" onClick={() => previewProposal(proposal.id)}>Preview diff</button><button className="secondary" onClick={() => transitionProposal(proposal.id, 'approve')}>Approve</button><button className="secondary" onClick={() => transitionProposal(proposal.id, 'reject')}>Reject</button><button className="secondary" disabled={status !== 'approved'} title={status === 'approved' ? 'Apply managed block to target page' : 'Approve before applying'} onClick={() => transitionProposal(proposal.id, 'apply')}>Apply</button></div></div>; })}
        </details>
        <details open><summary>Last Conduit result</summary>{result ? <pre>{JSON.stringify(result, null, 2).slice(0, 5000)}</pre> : <p className="muted">No query yet.</p>}</details>
        <details open><summary>Lorekeeper visual diff</summary>{proposalPreview ? <LorekeeperDiffPreview preview={proposalPreview} snapshots={markdownSnapshots} snapshotPreview={snapshotPreview} restoreConfirm={snapshotRestoreConfirm} onRestoreConfirmChange={setSnapshotRestoreConfirm} onPreviewSnapshot={async (snapshotPath) => { if (!proposalPreview?.proposal?.targetPageId) return; const response = await onPreviewLorekeeperSnapshot({ targetPageId: proposalPreview.proposal.targetPageId, snapshotPath }); setSnapshotPreview(response?.snapshot ?? response); }} onRestoreSnapshot={async (snapshotPath) => { if (!proposalPreview?.proposal?.targetPageId) return; const response = await onRestoreLorekeeperSnapshot({ targetPageId: proposalPreview.proposal.targetPageId, snapshotPath, confirm: snapshotRestoreConfirm }); setResult(response); setActionStatus(response?.errors ? `Restore blocked: ${response.errors.join(', ')}` : `Restored snapshot ${snapshotPath}; safety snapshot created.`); setSnapshotRestoreConfirm(''); }} /> : <p className="muted">Preview a proposal to see before/after markdown without applying it.</p>}</details>
        <details><summary>Connector boundary</summary><ol><li>Dispatches are local OpenClaw CLI calls, not public/external integrations.</li><li>Request and reply are redacted before durable Runledger storage.</li><li>Non-OpenClaw agents are blocked until their adapters exist.</li><li>Risky/destructive/external actions still require explicit approval.</li></ol></details>
      </aside>
    </div>
  </div>;
}


function LorekeeperDiffPreview({ preview, snapshots, snapshotPreview, restoreConfirm, onRestoreConfirmChange, onPreviewSnapshot, onRestoreSnapshot }: { preview: any; snapshots: any[]; snapshotPreview: any; restoreConfirm: string; onRestoreConfirmChange: (value: string) => void; onPreviewSnapshot: (snapshotPath: string) => Promise<void>; onRestoreSnapshot: (snapshotPath: string) => Promise<void> }) {
  const diff = markdownLineDiff(preview.before ?? '', preview.after ?? '');
  const added = diff.filter((line) => line.kind === 'added').length;
  const removed = diff.filter((line) => line.kind === 'removed').length;
  return <div className="lorekeeper-diff">
    <div className="diff-summary">
      <span className={preview.changed ? 'health health-limited' : 'health health-ok'}>{preview.changed ? 'changes pending' : 'no change'}</span>
      <span>Block <code>{preview.blockId ?? 'unknown'}</code></span>
      <span>{added} added · {removed} removed</span>
      {preview.targetPage?.relativePath && <span>{preview.targetPage.relativePath}</span>}
    </div>
    <div className="diff-grid">
      <section><h4>Before</h4><pre>{(preview.before ?? '').slice(0, 4000) || 'No existing page content.'}</pre></section>
      <section><h4>After</h4><pre>{(preview.after ?? '').slice(0, 4000) || 'No preview content.'}</pre></section>
    </div>
    {snapshots.length > 0 && <div className="snapshot-strip" aria-label="Markdown snapshots"><strong>Saved snapshots</strong>{snapshots.slice(0, 4).map((snapshot) => <span key={snapshot.snapshotPath}><code>{snapshot.snapshotPath}</code> · {new Date(snapshot.createdAt).toLocaleString()} <button className="secondary mini-button" onClick={() => void onPreviewSnapshot(snapshot.snapshotPath)}>Preview</button><button className="secondary mini-button" disabled={restoreConfirm !== 'RESTORE'} onClick={() => void onRestoreSnapshot(snapshot.snapshotPath)}>Restore</button></span>)}<label>Type RESTORE to enable snapshot restore<input value={restoreConfirm} onChange={(event) => onRestoreConfirmChange(event.target.value)} placeholder="RESTORE" /></label><p className="muted">Restore creates a new safety snapshot of current markdown before replacing page content.</p></div>}
    {snapshotPreview?.markdown && <details open><summary>Snapshot preview</summary><pre>{snapshotPreview.markdown.slice(0, 4000)}</pre></details>}
    <div className="line-diff" aria-label="Line-by-line Lorekeeper diff">
      {diff.slice(0, 180).map((line, index) => <code className={`diff-line ${line.kind}`} key={`${index}-${line.text.slice(0, 24)}`}>{line.prefix} {line.text || ' '}</code>)}
      {diff.length > 180 && <p className="muted">Diff truncated to first 180 lines for UI safety.</p>}
    </div>
  </div>;
}

function markdownLineDiff(before: string, after: string): { kind: 'same' | 'added' | 'removed'; prefix: string; text: string }[] {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  let prefix = 0;
  while (prefix < beforeLines.length && prefix < afterLines.length && beforeLines[prefix] === afterLines[prefix]) prefix++;
  let beforeSuffix = beforeLines.length - 1;
  let afterSuffix = afterLines.length - 1;
  while (beforeSuffix >= prefix && afterSuffix >= prefix && beforeLines[beforeSuffix] === afterLines[afterSuffix]) { beforeSuffix--; afterSuffix--; }
  const output: { kind: 'same' | 'added' | 'removed'; prefix: string; text: string }[] = [];
  beforeLines.slice(Math.max(0, prefix - 4), prefix).forEach((text) => output.push({ kind: 'same', prefix: ' ', text }));
  beforeLines.slice(prefix, beforeSuffix + 1).forEach((text) => output.push({ kind: 'removed', prefix: '-', text }));
  afterLines.slice(prefix, afterSuffix + 1).forEach((text) => output.push({ kind: 'added', prefix: '+', text }));
  afterLines.slice(afterSuffix + 1, Math.min(afterLines.length, afterSuffix + 5)).forEach((text) => output.push({ kind: 'same', prefix: ' ', text }));
  return output.length ? output : [{ kind: 'same', prefix: ' ', text: 'No line-level changes detected.' }];
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[char] ?? char);
}

function labelFor(graph: ArtifactGraph, id: string) {
  return graph.nodes.find((node) => node.id === id)?.title ?? id.slice(0, 8);
}

function GraphCanvas({ graph }: { graph: ArtifactGraph }) {
  const nodes = graph.nodes.slice(0, 36);
  if (!nodes.length) return <div className="graph-canvas empty-graph">No graph nodes yet</div>;
  const center = 110;
  const radius = 78;
  const positions = new Map(nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return [node.id, { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius }];
  }));
  const visibleIds = new Set(nodes.map((node) => node.id));
  return <svg className="graph-canvas" viewBox="0 0 220 220" role="img" aria-label="Artifact and wiki graph map">
    {graph.edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)).map((edge) => {
      const from = positions.get(edge.from)!;
      const to = positions.get(edge.to)!;
      return <line key={`${edge.from}-${edge.to}-${edge.kind ?? 'edge'}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={edge.kind === 'wikilink' ? 'wiki-edge' : 'artifact-edge'} />;
    })}
    {nodes.map((node) => {
      const position = positions.get(node.id)!;
      return <g key={node.id}>
        <circle cx={position.x} cy={position.y} r={node.kind === 'wiki' ? 6 : 7.5} className={node.kind === 'wiki' ? 'wiki-node' : 'artifact-node'} />
        <title>{node.kind === 'wiki' ? 'Wiki page' : 'Artifact'}: {node.title}</title>
      </g>;
    })}
  </svg>;
}

function WikiBridgeReportCard({ report }: { report: WikiBridgeReport | null }) {
  if (!report) return <div className="bridge-report muted">Index a wiki folder to see migration readiness.</div>;
  const status = report.recommendation === 'investigate' ? 'Investigate before migration' : 'Bridge mode recommended';
  return <div className="bridge-report">
    <strong>{status}</strong>
    <span>{report.pageCount} pages · {report.resolvedWikilinkCount}/{report.wikilinkCount} wikilinks resolved · {report.resolvedArtifactLinkCount}/{report.artifactLinkCount} artifact links resolved</span>
    <span>{report.orphanPageCount} orphan page{report.orphanPageCount === 1 ? '' : 's'}</span>
    {report.unresolvedWikilinks.slice(0, 3).map((item) => <em key={`${item.from}-${item.target}`}>Missing wiki: {item.from} → {item.target}</em>)}
    {report.unresolvedArtifactLinks.slice(0, 3).map((item) => <em key={`${item.from}-${item.artifactId}`}>Missing artifact: {item.from} → {item.artifactId.slice(0, 8)}</em>)}
  </div>;
}

function ArtifactDetail({ artifact, graph, onRefresh, onIndexDirty }: { artifact: ArtifactSummary; graph: ArtifactGraph; onRefresh: () => Promise<void>; onIndexDirty: () => void }) {
  const [notes, setNotes] = useState('');
  const [exportText, setExportText] = useState('');
  const [metadataTitle, setMetadataTitle] = useState(artifact.title);
  const [metadataTags, setMetadataTags] = useState(artifact.tags.join(', '));
  const [metadataTrust, setMetadataTrust] = useState<TrustLevel>(artifact.trustLevel);
  const [metadataPrompt, setMetadataPrompt] = useState(artifact.prompt);
  const [metadataModel, setMetadataModel] = useState(artifact.model);
  const [metadataProvider, setMetadataProvider] = useState(artifact.provider);
  const [metadataSourcePath, setMetadataSourcePath] = useState(artifact.sourcePath ?? '');
  const [metadataProject, setMetadataProject] = useState(artifact.project ?? '');
  const [snapshots, setSnapshots] = useState<ArtifactSnapshot[]>([]);

  const outgoing = graph.edges.filter((edge) => edge.from === artifact.id);
  const incoming = graph.edges.filter((edge) => edge.to === artifact.id);

  useEffect(() => {
    let cancelled = false;
    void window.artifactVault.readArtifact(artifact.id).then((bundle) => {
      if (!cancelled) {
        setNotes(bundle.notes);
        setMetadataTitle(bundle.metadata.title);
        setMetadataTags(bundle.metadata.tags.join(', '));
        setMetadataTrust(bundle.metadata.trustLevel);
        setMetadataPrompt(bundle.metadata.prompt);
        setMetadataModel(bundle.metadata.model);
        setMetadataProvider(bundle.metadata.provider);
        setMetadataSourcePath(bundle.metadata.sourcePath ?? '');
        setMetadataProject(bundle.metadata.project ?? '');
        setMetadataStatus('Metadata is loaded from metadata.json. Save changes to update search, graph, and exports.');
        setNotesStatus('Sidecar notes live beside the artifact as notes.md and travel with exports.');
      }
    });
    void window.artifactVault.listSnapshots(artifact.id).then((next) => {
      if (!cancelled) setSnapshots(next);
    });
    return () => { cancelled = true; };
  }, [artifact.id]);

  async function saveNotes() {
    setNotesStatus('Saving sidecar note…');
    const updated = await window.artifactVault.updateNotes(artifact.id, notes);
    setNotes(updated.notes);
    onIndexDirty();
    await onRefresh();
    setNotesStatus('Saved notes.md. Search, Markdown export, JSON export, and AI handoff packages now include the latest note.');
  }

  async function saveMetadata() {
    setMetadataStatus('Saving metadata…');
    const updated = await window.artifactVault.updateMetadata(artifact.id, {
      title: metadataTitle,
      tags: metadataTags.split(',').map((tag) => tag.trim()).filter(Boolean),
      trustLevel: metadataTrust,
      prompt: metadataPrompt,
      model: metadataModel,
      provider: metadataProvider,
      sourcePath: metadataSourcePath,
      project: metadataProject
    });
    setMetadataTitle(updated.metadata.title);
    setMetadataTags(updated.metadata.tags.join(', '));
    setMetadataTrust(updated.metadata.trustLevel);
    setMetadataPrompt(updated.metadata.prompt);
    setMetadataModel(updated.metadata.model);
    setMetadataProvider(updated.metadata.provider);
    setMetadataSourcePath(updated.metadata.sourcePath ?? '');
    setMetadataProject(updated.metadata.project ?? '');
    onIndexDirty();
    await onRefresh();
    setMetadataStatus('Saved metadata.json. Library search, graph labels, provenance, and exports now reflect these fields.');
  }

  async function snapshot() {
    await window.artifactVault.createSnapshot(artifact.id);
    setSnapshots(await window.artifactVault.listSnapshots(artifact.id));
    await onRefresh();
  }

  async function restoreSnapshot(snapshotId: string) {
    const restored = await window.artifactVault.restoreSnapshot(artifact.id, snapshotId);
    setNotes(restored.notes);
    setMetadataTitle(restored.metadata.title);
    setMetadataTags(restored.metadata.tags.join(', '));
    setMetadataTrust(restored.metadata.trustLevel);
    setMetadataPrompt(restored.metadata.prompt);
    setMetadataModel(restored.metadata.model);
    setMetadataProvider(restored.metadata.provider);
    setMetadataSourcePath(restored.metadata.sourcePath ?? '');
    setMetadataProject(restored.metadata.project ?? '');
    onIndexDirty();
    setSnapshots(await window.artifactVault.listSnapshots(artifact.id));
    await onRefresh();
  }

  async function exportMarkdown() {
    setExportText(await window.artifactVault.exportMarkdown(artifact.id));
  }

  async function exportJson() {
    setExportText(await window.artifactVault.exportJson(artifact.id));
  }

  async function exportPromptPackage() {
    setExportText(await window.artifactVault.exportPromptPackage(artifact.id));
  }

  async function exportMixedPromptPackage() {
    const wikiPageIds = incoming.filter((edge) => edge.from.startsWith('wiki:')).map((edge) => edge.from);
    setExportText(await window.artifactVault.exportMixedPromptPackage({ artifactIds: [artifact.id], wikiPageIds }));
  }

  async function exportBundleDirectory() {
    const exportedPath = await window.artifactVault.exportBundleDirectory(artifact.id);
    if (exportedPath) setExportText(`Portable bundle exported to:\n${exportedPath}`);
  }

  return <div className="artifact-detail">
    <header className="detail-header"><div><p className="eyebrow">{artifact.trustLevel} artifact</p><h2>{artifact.title}</h2><p>{artifact.id}</p></div><div className="pills"><span>network denied</span><span>no node bridge</span><span>{artifact.snapshotCount} snapshot</span></div></header>
    <div className="detail-grid">
      <iframe className="artifact-frame" title={artifact.title} src={`artifact://${artifact.id}/`} sandbox="allow-scripts" />
      <aside className="metadata-panel">
        <details open><summary>Provenance card</summary>
        <div className="provenance-card">
          <div><span>Capture source</span><strong>{artifact.sourceType}</strong><p>{artifact.sourcePath ? 'Imported from a local source path.' : 'Created inside the vault from paste or generated content.'}</p></div>
          <div><span>AI generator</span><strong>{artifact.provider || 'unknown provider'}{artifact.model ? ` / ${artifact.model}` : ''}</strong><p>{artifact.prompt ? artifact.prompt.slice(0, 180) : 'No source prompt recorded yet.'}</p></div>
          <div><span>Safety posture</span><strong>{metadataTrust}</strong><p>Replays through <code>artifact://</code> with no Node bridge; artifact-origin network requests are blocked by default.</p></div>
          <div><span>Integrity</span><strong>{artifact.snapshotCount} snapshot{artifact.snapshotCount === 1 ? '' : 's'}</strong><p>HTML SHA-256 <code>{artifact.hashes.sha256Html}</code></p></div>
        </div>
        <dl><dt>Created</dt><dd>{artifact.createdAt}</dd><dt>Updated</dt><dd>{artifact.updatedAt}</dd><dt>Source path</dt><dd>{artifact.sourcePath ? <code>{artifact.sourcePath}</code> : 'not recorded'}</dd><dt>Bundle</dt><dd><code>{artifact.bundlePath}</code></dd></dl>
        </details>
        <details open><summary>Metadata</summary>
        <p className="metadata-status">{metadataStatus}</p>
        <div className="metadata-summary">
          <span>Source: <code>{artifact.sourceType}</code></span>
          <span>Trust: <code>{metadataTrust}</code></span>
          <span>Project: <code>{metadataProject || 'none'}</code></span>
        </div>
        <label>Title<input value={metadataTitle} onChange={(event) => setMetadataTitle(event.target.value)} placeholder="Readable artifact title" /></label>
        <label>Project<input value={metadataProject} onChange={(event) => setMetadataProject(event.target.value)} placeholder="project or collection" /></label>
        <label>Tags<input value={metadataTags} onChange={(event) => setMetadataTags(event.target.value)} placeholder="demo, review" /></label>
        <label>Trust level<select value={metadataTrust} onChange={(event) => setMetadataTrust(event.target.value as TrustLevel)}><option value="untrusted">untrusted</option><option value="reviewed">reviewed</option><option value="trusted">trusted</option></select></label>
        <label>Provider<input value={metadataProvider} onChange={(event) => setMetadataProvider(event.target.value)} placeholder="OpenAI, Anthropic…" /></label>
        <label>Model<input value={metadataModel} onChange={(event) => setMetadataModel(event.target.value)} placeholder="model name" /></label>
        <label>Source path<input value={metadataSourcePath} onChange={(event) => setMetadataSourcePath(event.target.value)} placeholder="optional local source path" /></label>
        <label>Source prompt<textarea className="prompt-editor" value={metadataPrompt} onChange={(event) => setMetadataPrompt(event.target.value)} placeholder="Prompt or instruction that produced this artifact" /></label>
        <div className="button-row"><button onClick={saveMetadata}>Save metadata</button></div>
        </details>
        <details open><summary>Artifact map</summary>
        <LinkList title="Links out" edges={outgoing} direction="to" graph={graph} />
        <LinkList title="Backlinks" edges={incoming} direction="from" graph={graph} />
        </details>
        <details open><summary>Sidecar note</summary>
        <p className="metadata-status">{notesStatus}</p>
        <textarea className="notes-editor" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What matters about this artifact? Add review notes, links, follow-ups, or usage context." />
        <div className="button-row"><button onClick={saveNotes}>Save note</button><button className="secondary" onClick={snapshot}>Snapshot</button></div>
        </details>
        <details><summary>Snapshots</summary>
        <div className="snapshot-list">{snapshots.length ? snapshots.slice(0, 6).map((item) => <button className="secondary" key={item.id} onClick={() => restoreSnapshot(item.id)} title={item.htmlPath}>Restore {item.createdAt}</button>) : <p className="muted">No snapshots found.</p>}</div>
        </details>
        <details open><summary>Export</summary>
        <div className="button-row"><button className="secondary" onClick={exportMarkdown}>Markdown</button><button className="secondary" onClick={exportJson}>JSON</button><button className="secondary" onClick={exportPromptPackage}>Prompt package</button><button className="secondary" onClick={exportMixedPromptPackage}>Mixed package</button><button className="secondary" onClick={exportBundleDirectory}>Bundle folder</button></div>
        {exportText && <pre>{exportText}</pre>}
        </details>
      </aside>
    </div>
  </div>;
}

function MarkdownDetail({ pageId, graph, onRefresh }: { pageId: string; graph: ArtifactGraph; onRefresh: () => Promise<void> }) {
  const [page, setPage] = useState<WikiPageBundle | null>(null);
  const [markdownDraft, setMarkdownDraft] = useState('');
  const [exportText, setExportText] = useState('');
  const outgoing = graph.edges.filter((edge) => edge.from === pageId);
  const incoming = graph.edges.filter((edge) => edge.to === pageId);

  useEffect(() => {
    let cancelled = false;
    void window.artifactVault.readMarkdownPage(pageId).then((next) => {
      if (!cancelled) {
        setPage(next);
        setMarkdownDraft(next?.markdown ?? '');
      }
    });
    return () => { cancelled = true; };
  }, [pageId]);

  async function exportMixedPromptPackage() {
    const artifactIds = outgoing.filter((edge) => !edge.to.startsWith('wiki:')).map((edge) => edge.to);
    setExportText(await window.artifactVault.exportMixedPromptPackage({ artifactIds, wikiPageIds: [pageId] }));
  }

  async function saveVaultMarkdownPage() {
    const next = await window.artifactVault.updateMarkdownPage(pageId, markdownDraft);
    setPage(next);
    await onRefresh();
  }

  if (!page) return <div className="empty"><h2>Loading Markdown page…</h2></div>;

  return <div className="markdown-detail">
    <header className="detail-header"><div><p className="eyebrow">Markdown page · {page.node.sourceOwnership}</p><h2>{page.node.title}</h2><p>{page.node.relativePath}</p></div><div className="pills"><span>{page.node.sourceOwnership === 'vault-owned' ? 'editable local page' : 'read-only bridge'}</span><span>{page.node.wikilinks.length} wikilinks</span><span>{page.node.artifactLinks.length} artifact links</span></div></header>
    <div className="markdown-grid">
      <article className="markdown-preview">
        {page.node.sourceOwnership === 'vault-owned'
          ? <><textarea className="markdown-editor" value={markdownDraft} onChange={(event) => setMarkdownDraft(event.target.value)} /><button onClick={saveVaultMarkdownPage}>Save Markdown page</button></>
          : <pre>{page.markdown}</pre>}
      </article>
      <aside className="metadata-panel">
        <details open><summary>Source ownership</summary>
          <p className="muted">{page.node.sourceOwnership === 'vault-owned' ? 'This Markdown page lives inside the Artifact Vault pages folder and can be edited here.' : 'This Markdown page is indexed from an external vault in read-only bridge mode. Imbas OS can search, graph, and export it, but will not rewrite the source file by default.'}</p>
          <dl><dt>Page ID</dt><dd><code>{page.node.id}</code></dd><dt>Source path</dt><dd><code>{page.node.path}</code></dd><dt>Tags</dt><dd>{page.node.tags.join(', ') || 'none'}</dd></dl>
        </details>
        <details open><summary>Mixed backlinks</summary>
          <LinkList title="Links out" edges={outgoing} direction="to" graph={graph} />
          <LinkList title="Backlinks" edges={incoming} direction="from" graph={graph} />
        </details>
        <details open><summary>AI handoff</summary>
          <p className="muted">Export this Markdown page with directly linked artifacts as one prompt package.</p>
          <div className="button-row"><button onClick={exportMixedPromptPackage}>Export mixed package</button><button className="secondary" onClick={onRefresh}>Refresh graph</button></div>
          {exportText && <pre>{exportText}</pre>}
        </details>
      </aside>
    </div>
  </div>;
}

function LinkList({ title, edges, direction, graph }: { title: string; edges: { from: string; to: string }[]; direction: 'from' | 'to'; graph: ArtifactGraph }) {
  return <div className="link-list"><strong>{title}</strong>{edges.length ? edges.map((edge) => {
    const id = edge[direction];
    const node = graph.nodes.find((item) => item.id === id);
    return <p key={`${edge.from}-${edge.to}-${direction}`}><code>{node?.title ?? id.slice(0, 8)}</code>{node?.project && <span> · {node.project}</span>}</p>;
  }) : <p className="muted">none</p>}</div>;
}

function EmptyState() {
  return <div className="empty empty-vault"><p className="eyebrow">Artifact Vault</p><h2>No artifact selected yet</h2><p>Use the sidebar import panel to paste generated HTML, import a local <code>.html</code> file, or seed the demo vault. Imported artifacts are stored locally, marked <code>untrusted</code>, and replayed in the sandbox.</p></div>;
}

createRoot(document.getElementById('root')!).render(<App />);
