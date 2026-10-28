import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import {
  FILE_CHAR_LIMIT,
  FOLDER_PAGE_SIZE,
  activeNoteOutput,
  codeBlockAt,
  codeBlocks,
  listFolderOutput,
  readFileOutput,
} from "./read-tools";

const note = (path: string, frontmatter: Record<string, unknown> = {}): FileMetadata => ({
  path,
  name: path.split("/").pop()!,
  tags: [],
  links: [],
  frontmatter,
  modifiedAt: 0,
  wordCount: 0,
  tasks: [],
  handle: null,
});

const notes = {
  "Projects/Roadmap.md": note("Projects/Roadmap.md"),
  "Projects/Budget.md": note("Projects/Budget.md", { private: true }),
  "Inbox.md": note("Inbox.md"),
};

describe("listFolderOutput", () => {
  const listing = { notes, textFiles: ["Projects/build.py"], folders: ["Projects", "Projects/Archive"] };

  it("lists a folder's direct children, folders first, private notes hidden", () => {
    const output = listFolderOutput("Projects", 1, listing);

    expect(output).toContain("Projects holds 1 folder and 3 files:");
    expect(output.indexOf("Projects/Archive/ (folder)")).toBeLessThan(output.indexOf("Projects/Budget.md"));
    expect(output).toContain("- Projects/Budget.md (private (hidden))");
    expect(output).toContain("- Projects/build.py\n");
    expect(output).toContain("- Projects/Roadmap.md (note)");
    expect(output).not.toContain("Inbox.md");
  });

  it("lists the top level", () => {
    expect(listFolderOutput("", 1, listing)).toContain("- Projects/ (folder)");
  });

  it("says when a folder doesn't exist", () => {
    expect(listFolderOutput("Missing", 1, listing)).toMatch(/^No folder named "Missing"/);
  });

  it("pages a large folder", () => {
    const textFiles = Array.from({ length: FOLDER_PAGE_SIZE + 5 }, (_, i) => `Logs/run-${String(i).padStart(3, "0")}.log`);
    const big = { notes: {}, textFiles, folders: ["Logs"] };

    expect(listFolderOutput("Logs", 1, big)).toContain("[page 1 of 2; ask for page 2 for more]");
    const second = listFolderOutput("Logs", 2, big);
    expect(second).toContain("Logs/run-104.log");
    expect(second).not.toContain("Logs/run-000.log");
  });
});

describe("readFileOutput", () => {
  it("returns a file's text", () => {
    expect(readFileOutput("scripts/build.py", undefined, "print('ok')")).toBe("--- FILE: scripts/build.py ---\nprint('ok')\n--- END FILE ---");
  });

  it("caps a long file", () => {
    const output = readFileOutput("Logs/run.log", undefined, "x".repeat(FILE_CHAR_LIMIT + 10));
    expect(output).toContain("[lines 1–1 of 1; a line longer than the limit was cut]");
    expect(output.length).toBeLessThan(FILE_CHAR_LIMIT + 100);
  });

  it("never returns a private note", () => {
    expect(readFileOutput("Projects/Budget.md", notes["Projects/Budget.md"], "secret")).toContain("private (hidden)");
    expect(readFileOutput("Inbox.md", notes["Inbox.md"], "---\nprivate: true\n---\nsecret")).toContain("private (hidden)");
  });

  it("says when a file couldn't be read", () => {
    expect(readFileOutput("Missing.md", undefined, null)).toMatch(/couldn't be read/);
  });
});

describe("code blocks", () => {
  const doc = "# Notes\n```python\nprint('a')\n```\ntext\n~~~\nplain\n~~~\n";

  it("finds each fenced block in order", () => {
    expect(codeBlocks(doc).map(({ index, lang, code }) => ({ index, lang, code }))).toEqual([
      { index: 0, lang: "python", code: "print('a')" },
      { index: 1, lang: "", code: "plain" },
    ]);
  });

  it("finds the block at the cursor, or none", () => {
    expect(codeBlockAt(doc, doc.indexOf("print"))).toEqual({ index: 0, lang: "python", code: "print('a')" });
    expect(codeBlockAt(doc, doc.indexOf("text"))).toBeNull();
  });
});

describe("activeNoteOutput", () => {
  it("describes the open note, the selection and the code block", () => {
    const output = activeNoteOutput({
      path: "Inbox.md",
      selection: "Ship the beta",
      codeBlock: { index: 0, lang: "python", code: "print('a')" },
      isPrivate: false,
    });

    expect(output).toContain("Open note: Inbox.md");
    expect(output).toContain("Ship the beta");
    expect(output).toContain("code block 0 (python)");
  });

  it("hides a private note", () => {
    const output = activeNoteOutput({ path: "Projects/Budget.md", selection: "secret", codeBlock: null, isPrivate: true });

    expect(output).toContain("private (hidden)");
    expect(output).not.toContain("secret");
  });

  it("says when nothing is open", () => {
    expect(activeNoteOutput({ path: null, selection: "", codeBlock: null, isPrivate: false })).toBe("No note is open in the editor.");
  });
});
