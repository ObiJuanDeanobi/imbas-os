import { DatabaseSync } from 'node:sqlite';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { ArtifactSearchResult, SearchIndexStats } from '../../shared/types.js';
import { listArtifacts, readArtifact } from './vaultStore.js';

export async function rebuildSearchIndex(root: string): Promise<SearchIndexStats> {
  const indexPath = searchIndexPath(root);
  await mkdir(path.dirname(indexPath), { recursive: true });
  const db = new DatabaseSync(indexPath);
  try {
    db.exec(`
      DROP TABLE IF EXISTS artifact_fts;
      CREATE VIRTUAL TABLE artifact_fts USING fts5(
        id UNINDEXED,
        title,
        project,
        tags,
        notes,
        prompt,
        html_text,
        tokenize='porter unicode61'
      );
    `);
    const insert = db.prepare('INSERT INTO artifact_fts (id, title, project, tags, notes, prompt, html_text) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const artifacts = await listArtifacts(root);
    db.exec('BEGIN');
    try {
      for (const artifact of artifacts) {
        const bundle = await readArtifact(root, artifact.id);
        insert.run(artifact.id, artifact.title, artifact.project ?? '', artifact.tags.join(' '), bundle.notes, artifact.prompt, stripHtml(bundle.html));
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    const rebuiltAt = new Date().toISOString();
    await writeIndexManifest(db, rebuiltAt, artifacts.length);
    return { indexPath, artifactCount: artifacts.length, rebuiltAt };
  } finally {
    db.close();
  }
}

export async function searchArtifactsWithIndex(root: string, query: string): Promise<ArtifactSearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return (await listArtifacts(root)).map((artifact) => ({ ...artifact, matchReason: 'all artifacts' }));

  const indexPath = searchIndexPath(root);
  const db = new DatabaseSync(indexPath, { open: true });
  try {
    ensureIndexExists(db);
    const ftsQuery = toFtsQuery(normalizedQuery);
    if (!ftsQuery) return [];
    const rows = db.prepare(`
      SELECT id, title, project, tags, notes, prompt, html_text AS htmlText
      FROM artifact_fts
      WHERE artifact_fts MATCH ?
      ORDER BY rank
      LIMIT 100
    `).all(ftsQuery) as { id: string; title: string; project: string; tags: string; notes: string; prompt: string; htmlText: string }[];
    const artifacts = await listArtifacts(root);
    const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
    return rows.flatMap((row) => {
      const artifact = byId.get(row.id);
      return artifact ? [{ ...artifact, matchReason: matchReason(row, normalizedQuery) }] : [];
    });
  } catch (error) {
    if (String(error).includes('no such table: artifact_fts')) return [];
    throw error;
  } finally {
    db.close();
  }
}

function matchReason(row: { title: string; project: string; tags: string; notes: string; prompt: string; htmlText: string }, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const fields = [
    ['title', row.title],
    ['project', row.project],
    ['tags', row.tags],
    ['notes', row.notes],
    ['prompt', row.prompt],
    ['html', row.htmlText]
  ] as const;
  return fields.find(([, value]) => terms.some((term) => value.toLowerCase().includes(term)))?.[0] ?? 'index';
}

export function searchIndexPath(root: string) {
  return path.join(root, '.vault', 'index.sqlite');
}

function ensureIndexExists(db: DatabaseSync) {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'artifact_fts'").get();
  if (!table) throw new Error('no such table: artifact_fts');
}

async function writeIndexManifest(db: DatabaseSync, rebuiltAt: string, artifactCount: number) {
  db.exec('DROP TABLE IF EXISTS index_manifest; CREATE TABLE index_manifest (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
  const insert = db.prepare('INSERT INTO index_manifest (key, value) VALUES (?, ?)');
  insert.run('rebuiltAt', rebuiltAt);
  insert.run('artifactCount', String(artifactCount));
  insert.run('sourceOfTruth', 'filesystem artifact bundles');
}

function toFtsQuery(query: string) {
  return query
    .split(/\s+/)
    .map((term) => term.replace(/"/g, ''))
    .filter(Boolean)
    .map((term) => `"${term}"`)
    .join(' AND ');
}

function stripHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
}
