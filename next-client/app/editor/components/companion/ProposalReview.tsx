"use client";

import React, { useEffect, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import { EditorView } from "@codemirror/view";
import Button from "@/app/components/Button";
import { atom_companionProposals } from "@/app/atoms/companion-atoms";
import { atom_activeFilePath } from "@/app/atoms/atoms";
import { atom_activeEditorView } from "@/app/atoms/ui-atoms";
import type { CompanionProposal } from "./proposal";
import { useCompanionProposals } from "./use-companion-proposals";

function ProposalCard({ proposal, onSelect }: { proposal: CompanionProposal; onSelect: (index: number) => void }) {
  const { setHunkStatus, setActiveHunk, toggleWalkthroughDetails, discard, apply } = useCompanionProposals();
  const [applying, setApplying] = useState(false);
  const [feedback, setFeedback] = useState("");
  const active = proposal.hunks[proposal.activeHunkIndex];
  const advance = (status: "accepted" | "rejected") => {
    setHunkStatus(proposal.id, active.id, status);
    onSelect(Math.min(proposal.activeHunkIndex + 1, proposal.hunks.length - 1));
  };

  const applyProposal = async () => {
    setApplying(true);
    const result = await apply(proposal);
    setFeedback(result.output);
    setApplying(false);
  };

  return (
    <section className="rounded-xl border border-sage/40 bg-sage-light/20 p-3" aria-label={`Proposed changes for ${proposal.path}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="truncate text-ui-footnote font-semibold text-fg">Proposed: {proposal.path}</p>
        <span className="shrink-0 text-ui-caption text-fg-faint">{proposal.hunks.length} hunk{proposal.hunks.length === 1 ? "" : "s"}</span>
      </div>
      {proposal.summary && <p className="mb-2 text-ui-caption text-fg-muted">{proposal.summary}</p>}
      <div className="mb-3 grid grid-cols-2 gap-2" aria-label="Base and proposed comparison">
        <div className="min-w-0 rounded-lg bg-surface px-2.5 py-2">
          <p className="mb-1 text-ui-caption font-medium text-fg-faint">Current</p>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-ui-caption text-fg-muted">{proposal.baseContent || "(new file)"}</pre>
        </div>
        <div className="min-w-0 rounded-lg bg-sage-light/30 px-2.5 py-2">
          <p className="mb-1 text-ui-caption font-medium text-fg-faint">Proposed</p>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-ui-caption text-fg">{proposal.proposedContent || "(empty)"}</pre>
        </div>
      </div>
      <div className="rounded-lg bg-surface px-2.5 py-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-ui-caption font-medium text-fg">Step {proposal.activeHunkIndex + 1} of {proposal.hunks.length}</p>
          <Button variant="small" onClick={() => toggleWalkthroughDetails(proposal.id)}>
            {proposal.showWalkthroughDetails ? "Hide details" : "Show rationale"}
          </Button>
        </div>
        {proposal.showWalkthroughDetails && (
          <div className="mb-2 space-y-1 text-ui-caption text-fg-muted">
            <p><strong className="text-fg">Rationale:</strong> {active.explanation || "No rationale provided."}</p>
            <p><strong className="text-fg">Impact:</strong> {active.impact || "No impact noted."}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          <Button variant="small" isDisabled={proposal.activeHunkIndex === 0} onClick={() => onSelect(proposal.activeHunkIndex - 1)}>Previous</Button>
          <Button variant="small" isDisabled={proposal.activeHunkIndex === proposal.hunks.length - 1} onClick={() => onSelect(proposal.activeHunkIndex + 1)}>Next</Button>
          <Button variant="small" aria-pressed={active.status === "accepted"} onClick={() => advance("accepted")}>Accept</Button>
          <Button variant="small" aria-pressed={active.status === "rejected"} onClick={() => advance("rejected")}>Reject</Button>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" isDisabled={applying} className="!h-9 !px-3" onClick={() => void applyProposal()}>
          {applying ? "Applying…" : "Apply accepted changes"}
        </Button>
        <Button variant="secondary" isDisabled={applying} className="!h-9 !px-3" onClick={() => discard(proposal.id)}>Discard</Button>
      </div>
      {feedback && <p className="mt-2 text-ui-caption text-fg-muted" role="status">{feedback}</p>}
    </section>
  );
}

// Session-only review cards are deliberately separate from chat messages:
// tool calls create them, but only the explicit Apply button writes a note.
export default function ProposalReview() {
  const proposals = useAtomValue(atom_companionProposals);
  const store = useStore();
  const { setActiveHunk, setHunkStatus, toggleWalkthroughDetails } = useCompanionProposals();
  const activeProposal = proposals[0];
  const select = (proposal: CompanionProposal, index: number) => {
    setActiveHunk(proposal.id, index);
    if (store.get(atom_activeFilePath) !== proposal.path) return;
    const view = store.get(atom_activeEditorView);
    const hunk = proposal.hunks[index];
    if (!view || !hunk) return;
    view.dispatch({ effects: EditorView.scrollIntoView(hunk.from, { y: "center" }) });
    view.focus();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!activeProposal || !(event.metaKey || event.ctrlKey) || !event.altKey) return;
      const active = activeProposal.hunks[activeProposal.activeHunkIndex];
      if (!active) return;
      const key = event.key.toLowerCase();
      if (key === "n") select(activeProposal, activeProposal.activeHunkIndex + 1);
      else if (key === "p") select(activeProposal, activeProposal.activeHunkIndex - 1);
      else if (key === "a" || key === "r") {
        setHunkStatus(activeProposal.id, active.id, key === "a" ? "accepted" : "rejected");
        select(activeProposal, Math.min(activeProposal.activeHunkIndex + 1, activeProposal.hunks.length - 1));
      } else if (event.code === "Space") toggleWalkthroughDetails(activeProposal.id);
      else return;
      event.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeProposal, select, setHunkStatus, toggleWalkthroughDetails]);

  if (!proposals.length) return null;
  return <div className="flex flex-col gap-3">{proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} onSelect={(index) => select(proposal, index)} />)}</div>;
}
