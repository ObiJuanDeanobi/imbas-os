import { LorekeeperProposalInput } from './proposals.js';

export interface LorekeeperPolicyResult {
  action: 'auto-apply' | 'review-required';
  reason: string;
}

export function evaluateLorekeeperPolicy(proposal: LorekeeperProposalInput): LorekeeperPolicyResult {
  if (!proposal.sources || proposal.sources.length === 0) {
    return { action: 'review-required', reason: 'Proposal must include at least one source citation.' };
  }
  if (proposal.markdown.length > 2000) {
    return { action: 'review-required', reason: 'Markdown content exceeds 2000 character limit.' };
  }
  if (!proposal.targetPageId || (!proposal.targetPageId.startsWith('wiki/') && !proposal.targetPageId.startsWith('notes/'))) {
    return { action: 'review-required', reason: 'Target page is outside safe zones (must start with wiki/ or notes/).' };
  }
  if (proposal.markdown.includes('[REDACTED_')) {
    return { action: 'review-required', reason: 'Content contains redacted Sanctum secrets.' };
  }
  return { action: 'auto-apply', reason: 'Meets all low-risk managed block criteria.' };
}
