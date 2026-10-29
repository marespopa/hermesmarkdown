import { describe, expect, it } from "vitest";
import { decideHunk, newProposal, proposalContent } from "./proposal";

describe("companion proposals", () => {
  it("keeps independently accepted hunks and leaves rejected text untouched", () => {
    const proposal = newProposal("turn", "Note.md", "one\ntwo\nthree\n", "ONE\ntwo\nTHREE\n");
    proposal.hunks[0].status = "accepted";
    proposal.hunks[1].status = "rejected";

    expect(proposal.hunks).toHaveLength(2);
    expect(proposalContent(proposal)).toBe("ONE\ntwo\nthree\n");
  });

  it("represents an inserted line as a hunk", () => {
    const proposal = newProposal("turn", "Note.md", "one\nthree\n", "one\ntwo\nthree\n");

    expect(proposal.hunks[0]).toMatchObject({ from: 4, to: 4, insert: "two\n", status: "pending" });
  });

  it("carries concise walkthrough details into each hunk", () => {
    const proposal = newProposal("turn", "Note.md", "old", "new", "write", undefined, {
      summary: "Clarify the opening.",
      explanation: "Uses simpler wording.",
      impact: "low",
    });

    expect(proposal).toMatchObject({ summary: "Clarify the opening.", activeHunkIndex: 0, showWalkthroughDetails: false });
    expect(proposal.hunks[0]).toMatchObject({ explanation: "Uses simpler wording.", impact: "low" });
  });

  it("records a hunk's decision and moves on to the next hunk", () => {
    const proposal = newProposal("turn", "Note.md", "one\ntwo\nthree\n", "ONE\ntwo\nTHREE\n");
    const [next] = decideHunk([proposal], proposal.id, proposal.hunks[0].id, "accepted");

    expect(next.hunks.map((hunk) => hunk.status)).toEqual(["accepted", "pending"]);
    expect(next.activeHunkIndex).toBe(1);
    expect(decideHunk([next], next.id, next.hunks[1].id, "rejected")[0].activeHunkIndex).toBe(1);
  });
});
