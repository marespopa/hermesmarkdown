import { describe, expect, it, vi } from "vitest";
import { codeToFence, csvToMarkdownTable, embedKey, embedSection, expandEmbeds, fileCandidatePaths, findEmbeds, parseEmbedLine, rootImageLinks, type EmbedRef } from "./note-embeds";

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
    expect(parseEmbedLine("See /chapter-1.md")).toBeNull();
  });

  it("ignores links, inline embeds and file types it can't show", () => {
    expect(parseEmbedLine("[[Roadmap]]")).toBeNull();
    expect(parseEmbedLine("See ![[Roadmap]] here")).toBeNull();
    expect(parseEmbedLine("![[manual.pdf]]")).toBeNull();
    expect(parseEmbedLine("/manual.pdf")).toBeNull();
    expect(parseEmbedLine("![[]]")).toBeNull();
  });

  it("reads images and code files", () => {
    expect(parseEmbedLine("/assets/chart.png")).toEqual({ target: "assets/chart.png", heading: null, kind: "image" });
    expect(parseEmbedLine("![[diagram.SVG]]")).toEqual({ target: "diagram.SVG", heading: null, kind: "image" });
    expect(parseEmbedLine("/scripts/auth.ts")).toEqual({ target: "scripts/auth.ts", heading: null, kind: "code" });
    expect(parseEmbedLine("![[notes.txt]]")).toEqual({ target: "notes.txt", heading: null, kind: "code" });
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
  const FILES: Record<string, string> = {
    "Book.md": "# Book\n/chapters/One.md\n/chapters/Two.md",
    "chapters/One.md": "## One\nIntro ![chart](img/a.png)\n![[Two]]",
    "chapters/Two.md": "## Two\n![[Book]]\n/sales.csv",
    "sales.csv": "product,status\nSync,shipped",
    "scripts/auth.ts": "const token = `x`;\n",
  };
  const NAMES: Record<string, string> = { One: "chapters/One.md", Two: "chapters/Two.md", Book: "Book.md" };
  const read = vi.fn(async (ref: EmbedRef, fromPath: string) => {
    const folder = fromPath.split("/").slice(0, -1).join("/");
    const path = NAMES[ref.target.replace(/\.md$/, "").split("/").pop()!]
      ?? [folder ? `${folder}/${ref.target}` : ref.target, ref.target].find((p) => p in FILES);
    if (ref.kind === "image") return { path: "chapters/img/a.png", text: "" };
    return path && path in FILES ? { path, text: FILES[path] } : null;
  });

  it("fills in nested embeds and stops at loops", async () => {
    const out = await expandEmbeds(FILES["Book.md"], "Book.md", read);
    // Two appears twice: inside One and on its own line. Its ![[Book]] loops back, so it stays.
    expect(out.split("![[Book]]").length - 1).toBe(2);
    expect(out).toContain("## One");
    expect(out).not.toContain("/chapters/One.md");
    expect(out).toMatch(/\| Sync\s+\| shipped\s+\|/);
  });

  it("roots relative images from embedded notes", async () => {
    const out = await expandEmbeds("/chapters/One.md", "Book.md", read);
    expect(out).toContain("![chart](/chapters/img/a.png)");
  });

  it("turns code files into fences and images into image links", async () => {
    expect(await expandEmbeds("/scripts/auth.ts", "Book.md", read)).toBe("```ts\nconst token = `x`;\n```");
    expect(await expandEmbeds("/chart.png", "Book.md", read)).toBe("![a.png](/chapters/img/a.png)");
  });

  it("keeps lines it can't read and returns text without embeds unchanged", async () => {
    expect(await expandEmbeds("![[Missing]]", "Book.md", read)).toBe("![[Missing]]");
    expect(await expandEmbeds("Plain note", "Book.md", read)).toBe("Plain note");
  });
});

describe("codeToFence and rootImageLinks", () => {
  it("makes the fence longer than any backtick run", () => {
    expect(codeToFence("a ```` b", "x.md.txt")).toBe("`````txt\na ```` b\n`````");
  });

  it("leaves web, root and escaping links alone", () => {
    expect(rootImageLinks("![a](https://x.test/a.png) ![b](/b.png) ![c](../../c.png)", "n.md"))
      .toBe("![a](https://x.test/a.png) ![b](/b.png) ![c](../../c.png)");
    expect(rootImageLinks("![d](img/d.png)", "notes/n.md")).toBe("![d](/notes/img/d.png)");
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

describe("fileCandidatePaths", () => {
  it("looks next to the note first, then the vault root", () => {
    expect(fileCandidatePaths("data/sales.csv", "reports/Weekly.md")).toEqual(["reports/data/sales.csv", "data/sales.csv"]);
    expect(fileCandidatePaths("sales.csv", "Weekly.md")).toEqual(["sales.csv"]);
    expect(fileCandidatePaths("/data/sales.csv", "reports/Weekly.md")).toEqual(["data/sales.csv"]);
    expect(fileCandidatePaths("sales.csv", "draft")).toEqual(["sales.csv"]);
  });
});
