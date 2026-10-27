import { describe, expect, it } from "vitest";
import type { FileUndoStep } from "@/app/atoms/vault-atoms";
import { textFingerprint } from "@/app/workers/replace-search";
import { changedPaths, recordContent, recordCreate, trashedCount } from "./turn-journal";

const contentStep = (steps: FileUndoStep[], i = 0) => steps[i] as Extract<FileUndoStep, { kind: "content" }>;

describe("turn journal", () => {
  it("keeps the text from before the turn's first edit", () => {
    let steps = recordContent([], "Roadmap.md", "v1", "v2");
    steps = recordContent(steps, "Roadmap.md", "v2", "v3");

    expect(steps).toHaveLength(1);
    expect(contentStep(steps)).toMatchObject({ before: "v1", afterFingerprint: textFingerprint("v3") });
  });

  it("follows edits to a file the turn created", () => {
    let steps = recordCreate([], "Launch.md", "draft");
    steps = recordContent(steps, "Launch.md", "draft", "final");

    expect(steps).toEqual([{ kind: "create", path: "Launch.md", afterFingerprint: textFingerprint("final") }]);
  });

  it("starts a new step for an edit after a move, so undo can go back in order", () => {
    let steps = recordContent([], "Roadmap.md", "v1", "v2");
    steps = [...steps, { kind: "move", from: "Roadmap.md", to: "Archive/Roadmap.md" }];
    steps = recordContent(steps, "Archive/Roadmap.md", "v2", "v3");
    steps = recordContent(steps, "Roadmap.md", "", "new");

    expect(steps.map((step) => step.kind)).toEqual(["content", "move", "content", "content"]);
    expect(contentStep(steps, 2)).toMatchObject({ path: "Archive/Roadmap.md", before: "v2" });
  });

  it("lists every changed file where it is now, leaving out the Trash", () => {
    const steps: FileUndoStep[] = [
      ...recordCreate(recordContent([], "Roadmap.md", "a", "b"), "Launch.md", "x"),
      { kind: "move", from: "Roadmap.md", to: "Archive/Roadmap.md" },
      { kind: "folder", path: "Archive" },
      { kind: "move", from: "Old.md", to: ".hermesmarkdown/trash/2026-10-27/Old.md" },
    ];

    expect(changedPaths(steps)).toEqual(["Launch.md", "Archive/Roadmap.md"]);
    expect(trashedCount(steps)).toBe(1);
  });
});
