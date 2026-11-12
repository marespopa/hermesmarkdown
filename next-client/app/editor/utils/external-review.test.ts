import { describe, expect, it } from "vitest";
import {
  MAX_REVIEW_LINES,
  buildExternalReview,
  continueExternalReview,
  locateChange,
  undoEdit,
  withoutChanges,
} from "./external-review";

const BEFORE = "# Plan\n\nOld step\n\n## Notes\nkeep\n";
const AFTER = "# Plan\n\nNew step\n\n## Notes\nkeep\nextra\n";

describe("buildExternalReview", () => {
  it("splits the difference into changes, each under its heading", () => {
    const review = buildExternalReview("plan.md", BEFORE, AFTER);
    expect(review?.changes).toEqual([
      { id: "hunk-1", heading: "Plan", removed: "Old step\n", added: "New step\n", at: 8, anchor: "# Plan\n\n" },
      { id: "hunk-2", heading: "Notes", removed: "", added: "extra\n", at: 32, anchor: AFTER.slice(0, 32).slice(-40) },
    ]);
    expect(AFTER.slice(8, 8 + "New step\n".length)).toBe("New step\n");
  });

  it("has nothing to review for identical text or an oversized note", () => {
    expect(buildExternalReview("a.md", "same", "same")).toBeNull();
    const long = "x\n".repeat(MAX_REVIEW_LINES + 1);
    expect(buildExternalReview("a.md", long, `${long}y`)).toBeNull();
  });

  it("leaves # lines in code out of the headings", () => {
    const review = buildExternalReview("a.md", "```\n# not\n```\n", "```\n# not\n```\nnew\n");
    expect(review?.changes[0].heading).toBe("");
  });

  it("names no heading for a change above the first one", () => {
    const review = buildExternalReview("a.md", "intro\n\n# A\n", "intro!\n\n# A\n");
    expect(review?.changes[0].heading).toBe("");
  });
});

describe("continueExternalReview", () => {
  it("reviews two outside changes in a row against the text before the first", () => {
    const first = buildExternalReview("plan.md", BEFORE, AFTER);
    const second = continueExternalReview(first!, "plan.md", AFTER, `${AFTER}more\n`);
    expect(second?.before).toBe(BEFORE);
    expect(second?.after).toBe(`${AFTER}more\n`);
    expect(second?.changes.at(-1)?.added).toBe("extra\nmore\n");
  });

  it("starts fresh when the note changed in between", () => {
    const first = buildExternalReview("plan.md", BEFORE, AFTER);
    const second = continueExternalReview(first!, "plan.md", "typed meanwhile\n", "typed meanwhile\nand more\n");
    expect(second?.before).toBe("typed meanwhile\n");
  });
});

describe("locateChange and undoEdit", () => {
  const review = buildExternalReview("plan.md", BEFORE, AFTER)!;
  const [first] = review.changes;

  it("finds a change where it was", () => {
    expect(locateChange(AFTER, first)).toBe(8);
  });

  it("finds it again after text above it was added", () => {
    expect(locateChange(`Intro\n${AFTER}`, first)).toBe(14);
  });

  it("loses a change whose text was edited or that now appears twice", () => {
    expect(locateChange(AFTER.replace("New step", "Newer step"), first)).toBeNull();
    expect(locateChange(`Intro\n${AFTER}# Plan\n\nNew step\n`, first)).toBeNull();
  });

  it("puts the old text back", () => {
    const edit = undoEdit(first, 8);
    expect(AFTER.slice(0, edit.from) + edit.insert + AFTER.slice(edit.to)).toBe(
      "# Plan\n\nOld step\n\n## Notes\nkeep\nextra\n",
    );
  });
});

describe("withoutChanges", () => {
  const before = "a\nb\nc\nd\ne\n";
  const after = "a\nB\nB2\nc\nd\nE\n";
  const review = buildExternalReview("n.md", before, after)!;

  it("drops decided changes and ends the review when none are left", () => {
    expect(withoutChanges(review, new Set(["hunk-1"]))?.changes.map((change) => change.id)).toEqual(["hunk-2"]);
    expect(withoutChanges(review, new Set(["hunk-1", "hunk-2"]))).toBeNull();
  });

  it("moves later changes by the size of an undone one", () => {
    const [undone, later] = review.changes;
    const edit = { at: undone.at, delta: undone.removed.length - undone.added.length };
    const next = withoutChanges(review, new Set([undone.id]), [edit]);
    // After undoing, "E" sits where it did before the outside change grew the note.
    expect(next?.changes[0].at).toBe(later.at + edit.delta);
    expect("a\nb\nc\nd\nE\n".indexOf("E")).toBe(next?.changes[0].at);
  });
});
