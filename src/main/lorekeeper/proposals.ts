import { randomUUID } from 'node:crypto';
import { redactSensitiveText } from '../sanctum/secretHandles.js';

export type LorekeeperProposalStatus = 'proposed' | 'approved' | 'rejected' | 'applied';


export interface LorekeeperApplyResult {
  markdown: string;
  changed: boolean;
  blockId: string;
}

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


export function applyLorekeeperProposalToMarkdown(markdown: string, proposal: LorekeeperProposal): LorekeeperApplyResult {
  if (proposal.status !== 'approved') throw new Error('Lorekeeper proposal must be approved before apply');
  if (!proposal.targetPageId?.trim()) throw new Error('targetPageId is required before apply');
  if (!proposal.sources?.length) throw new Error('at least one source citation is required before apply');
  const blockId = slugify(proposal.title);
  const block = renderManagedBlock(blockId, proposal);
  const pattern = new RegExp(`\\n?<!-- IMBAS:LOREKEEPER:BEGIN ${escapeRegExp(blockId)} -->[\\s\\S]*?<!-- IMBAS:LOREKEEPER:END ${escapeRegExp(blockId)} -->`, 'm');
  if (pattern.test(markdown)) {
    const next = markdown.replace(pattern, `\n${block}`);
    return { markdown: next, changed: next !== markdown, blockId };
  }
  const separator = markdown.endsWith('\n') ? '\n' : '\n\n';
  return { markdown: `${markdown}${separator}${block}`, changed: true, blockId };
}

function renderManagedBlock(blockId: string, proposal: LorekeeperProposal): string {
  return [
    `<!-- IMBAS:LOREKEEPER:BEGIN ${blockId} -->`,
    `## ${proposal.title}`,
    '',
    proposal.markdown,
    '',
    `Sources: ${proposal.sources?.join(', ')}`,
    `Last reviewed: ${new Date().toISOString()}`,
    `Proposal: ${proposal.id}`,
    `<!-- IMBAS:LOREKEEPER:END ${blockId} -->`,
    ''
  ].join('\n');
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'lorekeeper-block';
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
