import { describe, expect, it } from "vitest";
import type { ChangedFile, ChangesResult } from "@/app/services/git/git-changes-types";
import { fileDiffText, gitDiffOutput, gitStatusOutput } from "./git-tools";

const textFile = (path: string, status: ChangedFile["status"], lines: string[], changes: Extract<ChangedFile["diff"], { kind: "text" }>["changes"], added = 1, removed = 1): ChangedFile =>
  ({ path, status, added, removed, diff: { kind: "text", lines, changes } });

const edited = textFile("src/a.ts", "modified", ["one", "TWO", "three"], [{ oldStart: 2, removed: ["two"], newStart: 2, newCount: 1 }]);
const ok = (...files: ChangedFile[]): ChangesResult => ({ status: "ok", commit: "abcdef1234", files });
const none = () => false;

describe("gitStatusOutput", () => {
  it("lists changed files with letters and line counts", () => {
    const added = textFile("src/new.ts", "added", ["x"], [{ oldStart: 0, removed: [], newStart: 1, newCount: 1 }], 1, 0);

    expect(gitStatusOutput(ok(edited, added), none)).toBe(
      "Compared with HEAD abcdef1. 2 changed files (A added, M modified, D deleted):\nM src/a.ts (+1 −1)\nA src/new.ts (+1 −0)",
    );
  });

  it("says when nothing changed, and when there is no repository", () => {
    expect(gitStatusOutput(ok(), none)).toContain("No uncommitted changes");
    expect(gitStatusOutput({ status: "no-repo" }, none)).toContain("isn't a git repository");
  });

  it("never shows private notes or the app's data folder", () => {
    const secret = textFile("Budget.md", "modified", ["x"], []);
    const data = textFile(".hermesmarkdown/index.yaml", "modified", ["x"], []);
    const sneaky = textFile("Diary.md", "modified", ["---", "private: true", "---", "secret"], []);

    const output = gitStatusOutput(ok(edited, secret, data, sneaky), (path) => path === "Budget.md");

    expect(output).toContain("src/a.ts");
    expect(output).not.toMatch(/Budget|hermesmarkdown|Diary/);
  });
});

describe("gitDiffOutput", () => {
  it("writes removed and added lines as hunks", () => {
    expect(fileDiffText(edited)).toBe("--- src/a.ts (modified)\n@@ -2,1 +2,1 @@\n-two\n+TWO");
  });

  it("limits the diff to a path or folder, or covers every file", () => {
    const other = textFile("docs/b.md", "modified", ["b"], [{ oldStart: 1, removed: ["a"], newStart: 1, newCount: 1 }]);

    expect(gitDiffOutput(ok(edited, other), "src", none)).toContain("src/a.ts");
    expect(gitDiffOutput(ok(edited, other), "src", none)).not.toContain("docs/b.md");
    expect(gitDiffOutput(ok(edited, other), "", none)).toContain("docs/b.md");
    expect(gitDiffOutput(ok(edited), "docs", none)).toContain("No uncommitted changes in docs");
  });

  it("says a binary file is binary", () => {
    const image: ChangedFile = { path: "a.png", status: "modified", added: null, removed: null, diff: { kind: "binary" } };
    expect(gitDiffOutput(ok(image), "a.png", none)).toContain("Binary file.");
  });
});
