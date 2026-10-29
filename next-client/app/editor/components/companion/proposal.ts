export type ProposalHunkStatus = "pending" | "accepted" | "rejected";
export type ProposalImpact = "low" | "medium" | "high";

export interface ProposalHunk {
  id: string;
  from: number;
  to: number;
  insert: string;
  status: ProposalHunkStatus;
  explanation: string;
  impact: ProposalImpact;
}

export interface CompanionProposal {
  id: string;
  turnId: string;
  path: string;
  baseContent: string;
  proposedContent: string;
  hunks: ProposalHunk[];
  operation: "write" | "create" | "template";
  templateName?: string;
  summary: string;
  activeHunkIndex: number;
  showWalkthroughDetails: boolean;
}

const lines = (text: string) => text.match(/.*(?:\n|$)/g)?.filter(Boolean) ?? [];

// A compact line LCS gives reviewable changes while retaining character
// offsets in the original document for the editor's quiet pending markers.
export function proposalHunks(base: string, proposed: string, explanation = "", impact: ProposalImpact = "low"): ProposalHunk[] {
  const before = lines(base);
  const after = lines(proposed);
  const lengths = Array.from({ length: before.length + 1 }, () => new Array(after.length + 1).fill(0));
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      lengths[i][j] = before[i] === after[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const changes: Array<{ from: number; to: number; insert: string }> = [];
  let i = 0; let j = 0; let offset = 0; let current: { from: number; to: number; insert: string } | null = null;
  const flush = () => {
    if (current) changes.push(current);
    current = null;
  };
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      flush(); offset += before[i++].length; j++; continue;
    }
    if (!current) current = { from: offset, to: offset, insert: "" };
    if (j < after.length && (i === before.length || lengths[i][j + 1] >= lengths[i + 1][j])) current.insert += after[j++];
    else { current.to += before[i].length; offset += before[i++].length; }
  }
  flush();
  return changes.map((change, index) => ({ id: `hunk-${index + 1}`, ...change, status: "pending", explanation, impact }));
}

export function proposalContent(proposal: CompanionProposal): string {
  let offset = 0;
  let text = proposal.baseContent;
  for (const hunk of proposal.hunks) {
    if (hunk.status !== "accepted") continue;
    const from = hunk.from + offset;
    const to = hunk.to + offset;
    text = `${text.slice(0, from)}${hunk.insert}${text.slice(to)}`;
    offset += hunk.insert.length - (hunk.to - hunk.from);
  }
  return text;
}

export function newProposal(
  turnId: string,
  path: string,
  baseContent: string,
  proposedContent: string,
  operation: CompanionProposal["operation"] = "write",
  templateName?: string,
  details: { summary?: string; explanation?: string; impact?: ProposalImpact } = {},
): CompanionProposal {
  return {
    id: `${turnId}:${path}:${Date.now()}`,
    turnId,
    path,
    baseContent,
    proposedContent,
    hunks: proposalHunks(baseContent, proposedContent, details.explanation, details.impact),
    operation,
    templateName,
    summary: details.summary ?? "",
    activeHunkIndex: 0,
    showWalkthroughDetails: false,
  };
}

// A hunk's decision, with the walkthrough moved on to the next hunk.
export function decideHunk(all: CompanionProposal[], proposalId: string, hunkId: string, status: ProposalHunkStatus): CompanionProposal[] {
  return all.map((proposal) => {
    if (proposal.id !== proposalId) return proposal;
    const index = proposal.hunks.findIndex((hunk) => hunk.id === hunkId);
    if (index < 0) return proposal;
    return {
      ...proposal,
      hunks: proposal.hunks.map((hunk) => hunk.id === hunkId ? { ...hunk, status } : hunk),
      activeHunkIndex: Math.min(index + 1, proposal.hunks.length - 1),
    };
  });
}
