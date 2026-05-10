import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ArtifactGraph, ArtifactSnapshot, ArtifactSummary, SearchIndexStats, SyncStatus, TrustLevel, UnifiedSearchResult, VaultInfo, WikiBridgeReport, WikiPageBundle } from '../shared/types';
import './styles.css';

const defaultHtml = `<!doctype html>
<html>
<head><title>First artifact</title><style>body{font-family:system-ui;margin:2rem} .card{border:1px solid #ddd;border-radius:16px;padding:1rem;max-width:560px} button{padding:.6rem 1rem;border-radius:999px;border:0;background:#111;color:white}</style></head>
<body><div class="card"><h1>Hello artifact vault</h1><p>This is a self-contained HTML artifact rendered in a sandbox.</p><button onclick="document.querySelector('p').textContent='Interaction stayed inside the artifact.'">Try interaction</button></div></body>
</html>`;

function App() {
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
  const [conduitStatus, setConduitStatus] = useState<any>(null);
  const [aiWorldQuery, setAiWorldQuery] = useState('Imbas OS');
  const [aiWorldResult, setAiWorldResult] = useState<any>(null);
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
    const created = await window.artifactVault.createArtifact({ html: sample ?? html, title, sourceType: 'paste', tags: ['demo'] });
    setIndexStats(null);
    await refresh();
    setSelectedId(created.metadata.id);
    setLastAction(`Imported ${created.metadata.title}. It is stored locally and rendered through the sandbox.`);
  }

  async function importHtmlFile() {
    const created = await window.artifactVault.importHtmlFile();
    if (!created) return;
    setIndexStats(null);
    await refresh();
    setSelectedId(created.metadata.id);
    setLastAction(`Imported ${created.metadata.title} from a local HTML file with source-path provenance.`);
  }

  async function importBundleDirectory() {
    const created = await window.artifactVault.importBundleDirectory();
    if (!created) return;
    setIndexStats(null);
    await refresh();
    setSelectedId(created.metadata.id);
    setLastAction(`Imported portable bundle ${created.metadata.title}. It was copied into the local vault as a new artifact.`);
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
          <h2>Import HTML</h2>
          <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>HTML<textarea value={html} onChange={(event) => setHtml(event.target.value)} /></label>
          <button onClick={() => importArtifact()}>Import artifact</button>
          <button className="secondary" onClick={importHtmlFile}>Import .html file</button>
          <button className="secondary" onClick={importBundleDirectory}>Import bundle folder</button>
          <button className="secondary" onClick={importMaliciousFixture}>Import malicious fixture</button>
          <button className="secondary" onClick={seedDemoVault}>Seed demo vault</button>
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
          <p className="muted">Sanctum redactions: {conduitStatus?.sanctumAudit?.length ?? 0}</p>
          <p className="muted">Memsocket: <code>{conduitStatus?.modules?.memsocket?.health ?? 'loading'}</code></p>
          <input placeholder="Search the agent world…" value={aiWorldQuery} onChange={(event) => setAiWorldQuery(event.target.value)} />
          <button className="secondary" onClick={searchAiWorld}>Search Conduit</button>
          <button className="secondary" onClick={buildAiWorldContextPack}>Context pack</button>
          <div className="bridge-report">
            {(conduitStatus?.recentRuns ?? []).slice(0, 3).map((run: any) => <em key={run.runId}>{run.outcome}: {run.task}</em>)}
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
        {selectedWikiId && selectedWikiNode ? <MarkdownDetail pageId={selectedWikiId} graph={graph} onRefresh={refresh} /> : selected ? <ArtifactDetail artifact={selected} graph={graph} onRefresh={refresh} onIndexDirty={() => setIndexStats(null)} /> : <EmptyState />}
      </section>
    </main>
  );
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
      }
    });
    void window.artifactVault.listSnapshots(artifact.id).then((next) => {
      if (!cancelled) setSnapshots(next);
    });
    return () => { cancelled = true; };
  }, [artifact.id]);

  async function saveNotes() {
    const updated = await window.artifactVault.updateNotes(artifact.id, notes);
    setNotes(updated.notes);
    onIndexDirty();
    await onRefresh();
  }

  async function saveMetadata() {
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
        <details open><summary>Provenance</summary>
        <dl><dt>Created</dt><dd>{artifact.createdAt}</dd><dt>Updated</dt><dd>{artifact.updatedAt}</dd><dt>SHA-256</dt><dd><code>{artifact.hashes.sha256Html}</code></dd><dt>Bundle</dt><dd><code>{artifact.bundlePath}</code></dd></dl>
        </details>
        <details open><summary>Metadata</summary>
        <label>Title<input value={metadataTitle} onChange={(event) => setMetadataTitle(event.target.value)} /></label>
        <label>Tags<input value={metadataTags} onChange={(event) => setMetadataTags(event.target.value)} placeholder="demo, review" /></label>
        <label>Trust level<select value={metadataTrust} onChange={(event) => setMetadataTrust(event.target.value as TrustLevel)}><option value="untrusted">untrusted</option><option value="reviewed">reviewed</option><option value="trusted">trusted</option></select></label>
        <label>Provider<input value={metadataProvider} onChange={(event) => setMetadataProvider(event.target.value)} placeholder="OpenAI, Anthropic…" /></label>
        <label>Model<input value={metadataModel} onChange={(event) => setMetadataModel(event.target.value)} placeholder="model name" /></label>
        <label>Source path<input value={metadataSourcePath} onChange={(event) => setMetadataSourcePath(event.target.value)} placeholder="optional local source path" /></label>
        <label>Project<input value={metadataProject} onChange={(event) => setMetadataProject(event.target.value)} placeholder="project or collection" /></label>
        <label>Source prompt<textarea className="prompt-editor" value={metadataPrompt} onChange={(event) => setMetadataPrompt(event.target.value)} /></label>
        <div className="button-row"><button onClick={saveMetadata}>Save metadata</button></div>
        </details>
        <details open><summary>Artifact map</summary>
        <LinkList title="Links out" edges={outgoing} direction="to" graph={graph} />
        <LinkList title="Backlinks" edges={incoming} direction="from" graph={graph} />
        </details>
        <details open><summary>Sidecar note</summary>
        <textarea className="notes-editor" value={notes} onChange={(event) => setNotes(event.target.value)} />
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
  return <div className="empty"><h2>No artifact selected</h2><p>Import a self-contained HTML file to start the vault loop.</p></div>;
}

createRoot(document.getElementById('root')!).render(<App />);
