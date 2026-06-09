import React, { useState, useEffect } from 'react';
import type { ArtifactGraph, ArtifactSnapshot, TrustLevel } from '../../../shared/types';

function LinkList({ title, edges, direction, graph }: { title: string; edges: { from: string; to: string }[]; direction: 'from' | 'to'; graph: ArtifactGraph }) {
  return <div className="link-list"><strong>{title}</strong>{edges.length ? edges.map((edge) => {
    const id = edge[direction];
    const node = graph.nodes.find((item) => item.id === id);
    return <p key={`${edge.from}-${edge.to}-${direction}`}><code>{node?.title ?? id.slice(0, 8)}</code>{node?.project && <span> · {node.project}</span>}</p>;
  }) : <p className="muted">none</p>}</div>;
}

export function InspectorPane({ 
  selected, 
  graph, 
  onRefresh, 
  onIndexDirty, 
  defaultTab = 'details' 
}: { 
  selected: any, 
  graph: any, 
  onRefresh: () => Promise<void>, 
  onIndexDirty: () => void, 
  defaultTab?: 'details' | 'notes' | 'provenance' | 'snapshots' | 'export' 
}) {
  const [activeInspectorTab, setActiveInspectorTab] = useState(defaultTab);
  
  // States
  const [notes, setNotes] = useState('');
  const [exportText, setExportText] = useState('');
  const [exportStatus, setExportStatus] = useState('Export Markdown, JSON, portable bundles, or AI-ready context packages without leaving the local vault.');
  const [metadataStatus, setMetadataStatus] = useState('Metadata is loaded from metadata.json. Save changes to update search, graph, and exports.');
  const [notesStatus, setNotesStatus] = useState('Sidecar notes live beside the artifact as notes.md and travel with exports.');
  const [snapshotStatus, setSnapshotStatus] = useState('Snapshots preserve artifact.html, metadata.json, and notes.md before important changes. Restore is reversible because the current state is snapshotted first.');
  const [snapshots, setSnapshots] = useState<any[]>([]);

  // Metadata form
  const [metadataTitle, setMetadataTitle] = useState(selected?.title ?? '');
  const [metadataTags, setMetadataTags] = useState(selected?.tags ? selected.tags.join(', ') : '');
  const [metadataTrust, setMetadataTrust] = useState<TrustLevel>(selected?.trustLevel ?? 'untrusted');
  const [metadataPrompt, setMetadataPrompt] = useState(selected?.prompt ?? '');
  const [metadataModel, setMetadataModel] = useState(selected?.model ?? '');
  const [metadataProvider, setMetadataProvider] = useState(selected?.provider ?? '');
  const [metadataSourcePath, setMetadataSourcePath] = useState(selected?.sourcePath ?? '');
  const [metadataProject, setMetadataProject] = useState(selected?.project ?? '');
  const [metadataTrustReason, setMetadataTrustReason] = useState('');

  const outgoing = selected ? graph.edges.filter((edge: any) => edge.from === selected.id) : [];
  const incoming = selected ? graph.edges.filter((edge: any) => edge.to === selected.id) : [];

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    if (selected.kind === 'wiki') {
      // It's a wiki node, we just reset the tabs
      setActiveInspectorTab(defaultTab);
      return;
    }

    // It's an artifact node
    setActiveInspectorTab(defaultTab);
    setMetadataTitle(selected.title || '');
    setMetadataTrust(selected.trustLevel || 'untrusted');
    setMetadataProject(selected.project || '');
    setMetadataTags(selected.tags ? selected.tags.join(', ') : '');
    setMetadataPrompt(selected.prompt || '');
    setMetadataModel(selected.model || '');
    setMetadataProvider(selected.provider || '');
    setMetadataSourcePath(selected.sourcePath || '');

    if (window.artifactVault) {
      void window.artifactVault.readArtifact(selected.id).then((bundle: any) => {
        if (!cancelled && bundle) {
          setNotes(bundle.notes || '');
          setMetadataTitle(bundle.metadata.title);
          setMetadataTags(bundle.metadata.tags.join(', '));
          setMetadataTrust(bundle.metadata.trustLevel);
          setMetadataPrompt(bundle.metadata.prompt || '');
          setMetadataModel(bundle.metadata.model || '');
          setMetadataProvider(bundle.metadata.provider || '');
          setMetadataSourcePath(bundle.metadata.sourcePath ?? '');
          setMetadataProject(bundle.metadata.project ?? '');
          setMetadataTrustReason('');
          setMetadataStatus('Metadata is loaded from metadata.json. Save changes to update search, graph, and exports.');
          setNotesStatus('Sidecar notes live beside the artifact as notes.md and travel with exports.');
          setSnapshotStatus('Snapshots preserve artifact.html, metadata.json, and notes.md before important changes. Restore is reversible because the current state is snapshotted first.');
        }
      });
      void window.artifactVault.listSnapshots(selected.id).then((next: any) => {
        if (!cancelled) setSnapshots(next || []);
      });
    }
    return () => { cancelled = true; };
  }, [selected, defaultTab]);

  if (!selected) {
    return (
      <aside className="inspector-pane">
        <header>
          <h3>Inspector</h3>
        </header>
        <div className="inspector-content">
          <p className="muted">Select an item to view details.</p>
        </div>
      </aside>
    );
  }

  const inspectorTabs = [
    { id: 'details', label: 'Details' },
    { id: 'notes', label: 'Notes' },
    { id: 'provenance', label: 'Provenance' },
    { id: 'snapshots', label: 'Snapshots' },
    { id: 'export', label: 'AI Context' }
  ] as const;

  // Actions
  async function saveNotes() {
    setNotesStatus('Saving sidecar note…');
    if (!window.artifactVault) return;
    const updated = await window.artifactVault.updateNotes(selected.id, notes);
    setNotes(updated.notes);
    onIndexDirty();
    await onRefresh();
    setNotesStatus('Saved notes.md. Search, Markdown export, JSON export, and AI handoff packages now include the latest note.');
  }

  async function saveMetadata() {
    setMetadataStatus('Saving metadata…');
    if (!window.artifactVault) return;
    const updated = await window.artifactVault.updateMetadata(selected.id, {
      title: metadataTitle,
      tags: metadataTags.split(',').map((tag) => tag.trim()).filter(Boolean),
      trustLevel: metadataTrust,
      prompt: metadataPrompt,
      model: metadataModel,
      provider: metadataProvider,
      sourcePath: metadataSourcePath,
      project: metadataProject,
      trustReason: metadataTrustReason
    });
    setMetadataTitle(updated.metadata.title);
    setMetadataTags(updated.metadata.tags.join(', '));
    setMetadataTrust(updated.metadata.trustLevel);
    setMetadataPrompt(updated.metadata.prompt);
    setMetadataModel(updated.metadata.model);
    setMetadataProvider(updated.metadata.provider);
    setMetadataSourcePath(updated.metadata.sourcePath ?? '');
    setMetadataProject(updated.metadata.project ?? '');
    setMetadataTrustReason('');
    onIndexDirty();
    await onRefresh();
    setMetadataStatus('Saved metadata.json. Library search, graph labels, provenance, and exports now reflect these fields.');
  }

  async function snapshot() {
    setSnapshotStatus('Creating snapshot…');
    if (!window.artifactVault) return;
    const created = await window.artifactVault.createSnapshot(selected.id);
    setSnapshots(await window.artifactVault.listSnapshots(selected.id));
    await onRefresh();
    setSnapshotStatus(`Created snapshot ${created.id}. You can restore it later without losing the current state.`);
  }

  async function restoreSnapshot(snapshotId: string) {
    setSnapshotStatus(`Restoring ${snapshotId}… the current state will be snapshotted first.`);
    if (!window.artifactVault) return;
    const restored = await window.artifactVault.restoreSnapshot(selected.id, snapshotId);
    setNotes(restored.notes);
    setMetadataTitle(restored.metadata.title);
    setMetadataTags(restored.metadata.tags.join(', '));
    setMetadataTrust(restored.metadata.trustLevel);
    setMetadataPrompt(restored.metadata.prompt);
    setMetadataModel(restored.metadata.model);
    setMetadataProvider(restored.metadata.provider);
    setMetadataSourcePath(restored.metadata.sourcePath ?? '');
    setMetadataProject(restored.metadata.project ?? '');
    setMetadataTrustReason('');
    onIndexDirty();
    setSnapshots(await window.artifactVault.listSnapshots(selected.id));
    await onRefresh();
    setSnapshotStatus(`Restored ${snapshotId}. A new safety snapshot was added, so the restore can be rolled back.`);
  }

  async function exportMarkdown() {
    if (!window.artifactVault) return;
    setExportText(await window.artifactVault.exportMarkdown(selected.id));
  }

  async function exportJson() {
    if (!window.artifactVault) return;
    setExportText(await window.artifactVault.exportJson(selected.id));
  }

  async function exportPromptPackage() {
    if (!window.artifactVault) return;
    const text = await window.artifactVault.exportPromptPackage(selected.id);
    setExportText(text);
    setExportStatus('Exported an AI context package with metadata, notes, prompt/provenance fields, and fenced HTML.');
  }

  async function copyAiContext() {
    if (!window.artifactVault) return;
    const text = await window.artifactVault.exportPromptPackage(selected.id);
    const localFirstReminder = 'Local-first safety reminder: this context package was assembled from a local Imbas OS Artifact Vault bundle. Treat generated HTML as untrusted unless reviewed; do not paste secrets into external AI tools.\n\n';
    const packageText = `${localFirstReminder}${text}`;
    setExportText(packageText);
    try {
      await navigator.clipboard.writeText(packageText);
      setExportStatus('Copied AI context package to clipboard. It includes metadata, notes, prompt/provenance fields, fenced HTML, and the local-first safety reminder.');
    } catch {
      setExportStatus('Prepared AI context package below. Clipboard permission was unavailable, so copy it manually from the preview.');
    }
  }

  async function exportMixedPromptPackage() {
    if (!window.artifactVault) return;
    if (selected.kind === 'wiki') {
      const artifactIds = outgoing.filter((edge: any) => !edge.to.startsWith('wiki:')).map((edge: any) => edge.to);
      setExportText(await window.artifactVault.exportMixedPromptPackage({ artifactIds, wikiPageIds: [selected.id] }));
      setExportStatus('Exported a mixed context package with directly linked artifacts.');
    } else {
      const wikiPageIds = incoming.filter((edge: any) => edge.from.startsWith('wiki:')).map((edge: any) => edge.from);
      setExportText(await window.artifactVault.exportMixedPromptPackage({ artifactIds: [selected.id], wikiPageIds }));
      setExportStatus('Exported a mixed context package with this artifact and directly linked Markdown/wiki context.');
    }
  }

  async function exportBundleDirectory() {
    if (!window.artifactVault) return;
    const exportedPath = await window.artifactVault.exportBundleDirectory(selected.id);
    if (exportedPath) setExportText(`Portable bundle exported to:\n${exportedPath}`);
  }

  if (selected.kind === 'wiki') {
    return (
      <aside className="inspector-pane">
        <header className="detail-header">
          <div>
            <p className="eyebrow">Markdown page</p>
            <h2>{selected.title}</h2>
            <p><code>{selected.id}</code></p>
          </div>
        </header>
        <div className="inspector-content">
          <details open>
            <summary>Source ownership</summary>
            <p className="muted">{selected.sourceOwnership === 'vault-owned' ? 'Editable local page' : 'Read-only bridge'}</p>
            <dl>
              <dt>Page ID</dt><dd><code>{selected.id}</code></dd>
              <dt>Source path</dt><dd><code>{selected.path}</code></dd>
            </dl>
          </details>
          <details open>
            <summary>Mixed backlinks</summary>
            <LinkList title="Links out" edges={outgoing} direction="to" graph={graph} />
            <LinkList title="Backlinks" edges={incoming} direction="from" graph={graph} />
          </details>
          <details open>
            <summary>AI handoff</summary>
            <p className="muted">Export this Markdown page with directly linked artifacts as one AI context package.</p>
            <div className="button-row"><button onClick={exportMixedPromptPackage}>Export mixed package</button><button className="secondary" onClick={onRefresh}>Refresh graph</button></div>
            {exportText && <pre>{exportText}</pre>}
          </details>
        </div>
      </aside>
    );
  }

  return (
    <aside className="inspector-pane" aria-label="Artifact inspector">
      <header className="detail-header">
        <div>
          <p className="eyebrow">{selected.trustLevel} artifact</p>
          <h2>{selected.title}</h2>
          <p><code>{selected.id}</code></p>
        </div>
      </header>
      <div className="inspector-tabs" role="tablist" aria-label="Artifact inspector tabs">
        {inspectorTabs.map((tab) => (
          <button 
            key={tab.id} 
            role="tab" 
            aria-selected={activeInspectorTab === tab.id} 
            className={activeInspectorTab === tab.id ? 'active' : ''} 
            onClick={() => setActiveInspectorTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeInspectorTab === 'details' && (
        <section className="inspector-section" role="tabpanel">
          <p className="metadata-status">{metadataStatus}</p>
          <div className="metadata-summary">
            <span>Source: <code>{selected.sourceType}</code></span>
            <span>Trust: <code>{metadataTrust}</code></span>
            <span>Project: <code>{metadataProject || 'none'}</code></span>
            <span>Bundle: <code>artifacts/{selected.id}</code></span>
          </div>
          <label>Title<input value={metadataTitle} onChange={(event) => setMetadataTitle(event.target.value)} placeholder="Readable artifact title" /></label>
          <label>Project<input value={metadataProject} onChange={(event) => setMetadataProject(event.target.value)} placeholder="project or collection" /></label>
          <label>Tags<input value={metadataTags} onChange={(event) => setMetadataTags(event.target.value)} placeholder="dashboard, report, tool" /></label>
          <label>Trust level<select value={metadataTrust} onChange={(event) => setMetadataTrust(event.target.value as TrustLevel)}><option value="untrusted">untrusted</option><option value="reviewed">reviewed</option><option value="trusted">trusted</option></select></label>
          {metadataTrust !== selected.trustLevel && <label>Trust review reason<textarea className="prompt-editor" value={metadataTrustReason} onChange={(event) => setMetadataTrustReason(event.target.value)} placeholder="Required when changing trust level. What did you review, and why is this transition appropriate?" /></label>}
          <label>Provider<input value={metadataProvider} onChange={(event) => setMetadataProvider(event.target.value)} placeholder="OpenAI, Anthropic…" /></label>
          <label>Model<input value={metadataModel} onChange={(event) => setMetadataModel(event.target.value)} placeholder="model name" /></label>
          <label>Source path<input value={metadataSourcePath} onChange={(event) => setMetadataSourcePath(event.target.value)} placeholder="optional local source path" /></label>
          <label>Source prompt<textarea className="prompt-editor" value={metadataPrompt} onChange={(event) => setMetadataPrompt(event.target.value)} placeholder="Prompt or instruction that produced this artifact" /></label>
          <div className="button-row"><button onClick={saveMetadata}>Save metadata</button></div>
          <div className="link-list"><LinkList title="Links out" edges={outgoing} direction="to" graph={graph} /><LinkList title="Backlinks" edges={incoming} direction="from" graph={graph} /></div>
        </section>
      )}
      {activeInspectorTab === 'notes' && (
        <section className="inspector-section" role="tabpanel">
          <p className="metadata-status">{notesStatus}</p>
          <textarea className="notes-editor" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add private notes about this artifact..." />
          <div className="button-row"><button onClick={saveNotes}>Save notes.md</button><button className="secondary" onClick={snapshot}>Snapshot</button></div>
        </section>
      )}
      {activeInspectorTab === 'provenance' && (
        <section className="inspector-section" role="tabpanel">
          <div className="provenance-card">
            <div><span>Capture source</span><strong>{selected.sourceType}</strong><p>{selected.sourcePath ? 'Imported from a local source path.' : 'Created inside the vault from paste or generated content.'}</p></div>
            <div><span>AI generator</span><strong>{selected.provider || 'unknown provider'}{selected.model ? ` / ${selected.model}` : ''}</strong><p>{selected.prompt ? selected.prompt.slice(0, 240) : 'No source prompt recorded yet.'}</p></div>
            <div><span>Safety posture</span><strong>{metadataTrust}</strong><p>Replays through <code>artifact://</code> with no Node bridge; artifact-origin network requests are blocked by default.</p></div>
            <div><span>Trust audit</span><strong>{selected.trustAudit?.length ?? 0} entries</strong><p>{selected.trustAudit?.at(-1)?.reason ?? 'Imported artifacts start untrusted until reviewed.'}</p></div>
            <div><span>Integrity</span><strong>{selected.snapshotCount} snapshot{selected.snapshotCount === 1 ? '' : 's'}</strong><p>HTML SHA-256 <code>{selected.hashes?.sha256Html ?? 'pending'}</code></p></div>
          </div>
          <dl><dt>Created</dt><dd>{selected.createdAt}</dd><dt>Updated</dt><dd>{selected.updatedAt}</dd><dt>Source path</dt><dd>{selected.sourcePath ? <code>{selected.sourcePath}</code> : 'not recorded'}</dd><dt>Bundle</dt><dd><code>artifacts/{selected.id}</code></dd></dl>
          <div className="snapshot-list">{selected.trustAudit?.slice().reverse().map((entry: any) => <article className="snapshot-card" key={`${entry.at}-${entry.from}-${entry.to}`}><strong>{entry.from} → {entry.to}</strong><span>{new Date(entry.at).toLocaleString()}</span><p>{entry.reason}</p></article>)}</div>
        </section>
      )}
      {activeInspectorTab === 'snapshots' && (
        <section className="inspector-section" role="tabpanel">
          <p className="metadata-status">{snapshotStatus}</p>
          <div className="button-row"><button onClick={snapshot}>Create snapshot</button></div>
          <div className="snapshot-list">{snapshots.length ? snapshots.slice(0, 10).map((item) => <article className="snapshot-card" key={item.id}>
            <strong>{new Date(item.createdAt).toLocaleString()}</strong>
            <span>ID <code>{item.id}</code></span>
            <span>HTML <code>{item.htmlPath}</code></span>
            <span>Metadata <code>{item.metadataPath}</code></span>
            <button className="secondary" onClick={() => restoreSnapshot(item.id)}>Restore this snapshot</button>
          </article>) : <p className="muted">No snapshots found. Create one before a risky edit or metadata change.</p>}</div>
        </section>
      )}
      {activeInspectorTab === 'export' && (
        <section className="inspector-section" role="tabpanel">
          <p className="metadata-status">{exportStatus}</p>
          <div className="button-row"><button onClick={copyAiContext}>Copy AI context</button><button className="secondary" onClick={exportPromptPackage}>Export context package</button><button className="secondary" onClick={exportMixedPromptPackage}>Mixed artifact + wiki package</button><button className="secondary" onClick={exportMarkdown}>Markdown</button><button className="secondary" onClick={exportJson}>JSON</button><button className="secondary" onClick={exportBundleDirectory}>Bundle folder</button></div>
          {exportText && <pre>{exportText}</pre>}
        </section>
      )}
    </aside>
  );
}
