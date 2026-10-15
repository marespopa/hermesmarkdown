import { describe, expect, it, vi } from "vitest";
import { csvCandidatePaths, csvToMarkdownTable, embedKey, embedSection, expandEmbeds, findEmbeds, parseEmbedLine } from "./note-embeds";

describe("parseEmbedLine", () => {
  it("reads a note, a heading and an alias", () => {
    expect(parseEmbedLine("![[Roadmap]]")).toEqual({ target: "Roadmap", heading: null, kind: "note" });
    expect(parseEmbedLine("  ![[Specs/Roadmap#Q3 goals|goals]]  ")).toEqual({ target: "Specs/Roadmap", heading: "Q3 goals", kind: "note" });
    expect(parseEmbedLine("![[Sprint plan.board]]")).toEqual({ target: "Sprint plan.board", heading: null, kind: "note" });
  });

  it("reads slash lines and CSV files", () => {
    expect(parseEmbedLine("/chapter-1.md")).toEqual({ target: "chapter-1.md", heading: null, kind: "note" });
    expect(parseEmbedLine("/data/sales.csv")).toEqual({ target: "data/sales.csv", heading: null, kind: "csv" });
    expect(parseEmbedLine("![[sales.csv#Ignored]]")).toEqual({ target: "sales.csv", heading: null, kind: "csv" });
    expect(parseEmbedLine("/board")).toBeNull();
    expect(parseEmbedLine("/notes.txt")).toBeNull();
    expect(parseEmbedLine("See /chapter-1.md")).toBeNull();
  });

  it("ignores links, inline embeds and image files", () => {
    expect(parseEmbedLine("[[Roadmap]]")).toBeNull();
    expect(parseEmbedLine("See ![[Roadmap]] here")).toBeNull();
    expect(parseEmbedLine("![[diagram.png]]")).toBeNull();
    expect(parseEmbedLine("![[]]")).toBeNull();
  });
});

describe("embedKey", () => {
  it("ignores case", () => {
    expect(embedKey({ target: "Roadmap", heading: "Goals", kind: "note" })).toBe(embedKey({ target: "roadmap", heading: "goals", kind: "note" }));
    expect(embedKey({ target: "Roadmap", heading: null, kind: "note" })).not.toBe(embedKey({ target: "Roadmap", heading: "Goals", kind: "note" }));
  });
});

describe("findEmbeds", () => {
  it("finds embed lines outside fenced code", () => {
    const text = ["# Status", "![[Roadmap]]", "```", "![[Not this]]", "```", "![[Backlog#Open]]", "/sales.csv"].join("\n");
    expect(findEmbeds(text)).toEqual([
      { line: 2, ref: { target: "Roadmap", heading: null, kind: "note" } },
      { line: 6, ref: { target: "Backlog", heading: "Open", kind: "note" } },
      { line: 7, ref: { target: "sales.csv", heading: null, kind: "csv" } },
    ]);
  });
});

describe("embedSection", () => {
  const NOTE = ["---", "status: draft", "---", "# Roadmap", "", "Intro", "", "## Q3", "Ship sync", "### Detail", "More", "## Q4", "Polish"].join("\n");

  it("returns the note without its frontmatter", () => {
    expect(embedSection(NOTE, null)).toBe(NOTE.split("\n").slice(3).join("\n"));
  });

  it("returns a heading's section through its subheadings", () => {
    expect(embedSection(NOTE, "q3")).toBe("## Q3\nShip sync\n### Detail\nMore");
    expect(embedSection(NOTE, "Q4")).toBe("## Q4\nPolish");
  });

  it("is null for a missing heading", () => {
    expect(embedSection(NOTE, "Q5")).toBeNull();
  });

  it("leaves a board's scene out", () => {
    const board = "---\nhermes: board\n---\n\nCaption\n\n```hermes-board\n{\"elements\":[]}\n```\n";
    expect(embedSection(board, null)).toBe("Caption");
  });
});

describe("expandEmbeds", () => {
  it("replaces embed lines with the embedded text, one level deep", async () => {
    const read = vi.fn(async ({ target }: { target: string }) => (target === "Roadmap" ? "# Roadmap\n![[Backlog]]" : null));
    const text = "Intro\n![[Roadmap]]\n![[Missing]]\n![[roadmap]]";
    expect(await expandEmbeds(text, read)).toBe("Intro\n# Roadmap\n![[Backlog]]\n![[Missing]]\n# Roadmap\n![[Backlog]]");
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("returns text without embeds unchanged", async () => {
    const read = vi.fn();
    expect(await expandEmbeds("Plain note", read)).toBe("Plain note");
    expect(read).not.toHaveBeenCalled();
  });
});

describe("expandEmbeds with CSV", () => {
  it("prints a CSV as a table", async () => {
    const read = vi.fn(async () => "product,status\nSync,shipped");
    const lines = (await expandEmbeds("/sales.csv", read)).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^\| product\s+\| status\s+\|$/);
    expect(lines[2]).toMatch(/^\| Sync\s+\| shipped\s+\|$/);
  });
});

describe("csvToMarkdownTable", () => {
  it("makes the first row the header and pads ragged rows", () => {
    const table = csvToMarkdownTable("\uFEFFproduct,status,owner\nSync,shipped\n");
    const lines = table.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("product");
    expect(lines[2].split("|").length).toBe(lines[0].split("|").length);
  });

  it("reads tab-separated text and empty files", () => {
    expect(csvToMarkdownTable("a\tb\n1\t2").split("\n")[2]).toMatch(/^\| 1\s+\| 2\s+\|$/);
    expect(csvToMarkdownTable("  ")).toBe("");
  });
});

describe("csvCandidatePaths", () => {
  it("looks next to the note first, then the vault root", () => {
    expect(csvCandidatePaths("data/sales.csv", "reports/Weekly.md")).toEqual(["reports/data/sales.csv", "data/sales.csv"]);
    expect(csvCandidatePaths("sales.csv", "Weekly.md")).toEqual(["sales.csv"]);
    expect(csvCandidatePaths("/data/sales.csv", "reports/Weekly.md")).toEqual(["data/sales.csv"]);
    expect(csvCandidatePaths("sales.csv", "draft")).toEqual(["sales.csv"]);
  });
});
