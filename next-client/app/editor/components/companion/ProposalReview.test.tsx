import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_companionProposals } from "@/app/atoms/companion-atoms";
import ProposalReview from "./ProposalReview";

const setHunkStatus = vi.fn();
const setActiveHunk = vi.fn();
const toggleWalkthroughDetails = vi.fn();
const discard = vi.fn();
vi.mock("./use-companion-proposals", () => ({
  useCompanionProposals: () => ({
    setHunkStatus, setActiveHunk, toggleWalkthroughDetails, discard,
    apply: vi.fn().mockResolvedValue({ output: "Saved", detail: "rewritten" }),
  }),
}));

function renderReview() {
  const store = createStore();
  store.set(atom_companionProposals, [{
    id: "proposal", turnId: "turn", path: "Note.md", baseContent: "Before", proposedContent: "After",
    operation: "write", summary: "Make the note clearer.", activeHunkIndex: 0, showWalkthroughDetails: false,
    hunks: [{ id: "hunk-1", from: 0, to: 6, insert: "After", status: "pending", explanation: "Simpler wording.", impact: "low" }],
  }]);
  return render(<Provider store={store}><ProposalReview /></Provider>);
}

describe("ProposalReview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a side-by-side comparison and the active walkthrough step", () => {
    renderReview();

    expect(screen.getByText("Current")).toBeTruthy();
    expect(screen.getByText("Proposed")).toBeTruthy();
    expect(screen.getByText("Before")).toBeTruthy();
    expect(screen.getByText("After")).toBeTruthy();
    expect(screen.getByText("Step 1 of 1")).toBeTruthy();
  });

  it("shows concise rationale and accepts the active hunk", () => {
    renderReview();

    fireEvent.click(screen.getByText("Show rationale"));
    expect(toggleWalkthroughDetails).toHaveBeenCalledWith("proposal");
    fireEvent.click(screen.getByText("Accept"));
    expect(setHunkStatus).toHaveBeenCalledWith("proposal", "hunk-1", "accepted");
  });

  it("discards an unapplied proposal", () => {
    renderReview();

    fireEvent.click(screen.getByText("Discard"));
    expect(discard).toHaveBeenCalledWith("proposal");
  });
});
