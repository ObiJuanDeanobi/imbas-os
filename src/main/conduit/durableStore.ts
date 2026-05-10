import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { ConduitRecordStore } from './localApi.js';
import { createDefaultModuleRegistry } from '../../shared/imbas/modules.js';
import { ImbasContextEventDraft, ImbasRunSummaryDraft } from '../../shared/imbas/protocol.js';

export interface DurableConduitStoreOptions {
  dir: string;
}

export async function createDurableConduitRecordStore(options: DurableConduitStoreOptions): Promise<ConduitRecordStore> {
  await mkdir(options.dir, { recursive: true });
  const eventsPath = path.join(options.dir, 'events.jsonl');
  const runsPath = path.join(options.dir, 'runs.jsonl');
  const store: ConduitRecordStore = {
    events: await readJsonl<ImbasContextEventDraft>(eventsPath),
    runs: await readJsonl<ImbasRunSummaryDraft>(runsPath),
    modules: createDefaultModuleRegistry(),
    persist: async () => {
      await writeJsonl(eventsPath, store.events);
      await writeJsonl(runsPath, store.runs);
    }
  };
  return store;
}

async function readJsonl<T>(file: string): Promise<T[]> {
  if (!existsSync(file)) return [];
  const text = await readFile(file, 'utf8');
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line) as T);
}

async function writeJsonl<T>(file: string, records: T[]): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, records.map((record) => JSON.stringify(record)).join('\n') + (records.length ? '\n' : ''));
}
