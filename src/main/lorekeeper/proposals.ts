import { randomUUID } from 'node:crypto';
import { redactSensitiveText } from '../sanctum/secretHandles.js';

export type LorekeeperProposalStatus = 'proposed' | 'approved' | 'rejected';

export interface LorekeeperProposalInput {
  title: string;
  markdown: string;
  rationale: string;
  connector: string;
  agent: string;
  targetPageId?: string;
  sources?: string[];
  createdAt?: string;
}

export interface LorekeeperProposal extends LorekeeperProposalInput {
  id: string;
  status: LorekeeperProposalStatus;
  createdAt: string;
  updatedAt: string;
}

export function createLorekeeperProposal(input: LorekeeperProposalInput): LorekeeperProposal {
  const now = new Date().toISOString();
  return {
    id: `lore_${randomUUID()}`,
    title: cleanRequired(input.title, 'title'),
    markdown: redactSensitiveText(cleanRequired(input.markdown, 'markdown')),
    rationale: redactSensitiveText(cleanRequired(input.rationale, 'rationale')),
    connector: cleanRequired(input.connector, 'connector'),
    agent: cleanRequired(input.agent, 'agent'),
    targetPageId: input.targetPageId,
    sources: [...new Set((input.sources ?? []).map((source) => source.trim()).filter(Boolean))],
    status: 'proposed',
    createdAt: input.createdAt ?? now,
    updatedAt: now
  };
}

export function transitionLorekeeperProposal(proposal: LorekeeperProposal, status: LorekeeperProposalStatus): LorekeeperProposal {
  return { ...proposal, status, updatedAt: new Date().toISOString() };
}

export function searchLorekeeperProposals(proposals: LorekeeperProposal[], query: string, limit = 20): LorekeeperProposal[] {
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? proposals.filter((proposal) => JSON.stringify(proposal).toLowerCase().includes(needle))
    : proposals;
  return matches.slice(-Math.max(1, Math.min(100, limit))).reverse();
}

function cleanRequired(value: string, field: string): string {
  const cleaned = value.trim();
  if (!cleaned) throw new Error(`${field} is required`);
  return cleaned;
}
