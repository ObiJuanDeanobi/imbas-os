import { randomUUID } from 'node:crypto';

export type RunledgerEntryKind = 'run' | 'event' | 'sanctum' | 'lorekeeper';
export type RunledgerOutcome = 'completed' | 'blocked' | 'failed' | 'cancelled' | 'accepted' | 'proposed' | 'applied' | 'redacted';

export interface RunledgerEntryInput {
  kind: RunledgerEntryKind;
  connector: string;
  agent: string;
  title: string;
  outcome: RunledgerOutcome;
  summary: string;
  refs?: string[];
  createdAt?: string;
}

export interface RunledgerEntry extends RunledgerEntryInput {
  id: string;
  createdAt: string;
}

export function createRunledgerEntry(input: RunledgerEntryInput): RunledgerEntry {
  return {
    id: `runledger_${randomUUID()}`,
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...input,
    refs: input.refs ?? []
  };
}

export function searchRunledger(entries: RunledgerEntry[], query: string, limit = 20): RunledgerEntry[] {
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? entries.filter((entry) => JSON.stringify(entry).toLowerCase().includes(needle))
    : entries;
  return matches.slice(-Math.max(1, Math.min(100, limit))).reverse();
}
