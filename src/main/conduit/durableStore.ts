import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { ConduitRecordStore, ConduitSanctumAuditEntry } from './localApi.js';
import { RunledgerEntry } from '../runledger/store.js';
import { LorekeeperProposal } from '../lorekeeper/proposals.js';
import { MobilePairingChallenge, MobileSession } from '../mobile/pairing.js';
import { createDefaultModuleRegistry } from '../../shared/imbas/modules.js';
import { ImbasContextEventDraft, ImbasRunSummaryDraft } from '../../shared/imbas/protocol.js';

export interface DurableConduitStoreOptions {
  dir: string;
}

export async function createDurableConduitRecordStore(options: DurableConduitStoreOptions): Promise<ConduitRecordStore> {
  await mkdir(options.dir, { recursive: true });
  const eventsPath = path.join(options.dir, 'events.jsonl');
  const runsPath = path.join(options.dir, 'runs.jsonl');
  const auditPath = path.join(options.dir, 'sanctum-audit.jsonl');
  const runledgerPath = path.join(options.dir, 'runledger.jsonl');
  const lorekeeperPath = path.join(options.dir, 'lorekeeper-proposals.jsonl');
  const mobileChallengesPath = path.join(options.dir, 'mobile-pairing-challenges.jsonl');
  const mobileSessionsPath = path.join(options.dir, 'mobile-sessions.jsonl');
  const store: ConduitRecordStore = {
    events: await readJsonl<ImbasContextEventDraft>(eventsPath),
    runs: await readJsonl<ImbasRunSummaryDraft>(runsPath),
    sanctumAudit: await readJsonl<ConduitSanctumAuditEntry>(auditPath),
    runledger: await readJsonl<RunledgerEntry>(runledgerPath),
    lorekeeperProposals: await readJsonl<LorekeeperProposal>(lorekeeperPath),
    mobile: {
      challenges: await readJsonl<MobilePairingChallenge>(mobileChallengesPath),
      sessions: await readJsonl<MobileSession>(mobileSessionsPath)
    },
    modules: createDefaultModuleRegistry(),
    persist: async () => {
      await writeJsonl(eventsPath, store.events);
      await writeJsonl(runsPath, store.runs);
      await writeJsonl(auditPath, store.sanctumAudit);
      await writeJsonl(runledgerPath, store.runledger);
      await writeJsonl(lorekeeperPath, store.lorekeeperProposals);
      await writeJsonl(mobileChallengesPath, store.mobile.challenges);
      await writeJsonl(mobileSessionsPath, store.mobile.sessions);
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
