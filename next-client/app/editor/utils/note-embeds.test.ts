import { describe, expect, it, vi } from "vitest";
import { embedKey, embedSection, expandEmbeds, findEmbeds, parseEmbedLine } from "./note-embeds";

describe("parseEmbedLine", () => {
  it("reads a note, a heading and an alias", () => {
    expect(parseEmbedLine("![[Roadmap]]")).toEqual({ target: "Roadmap", heading: null });
    expect(parseEmbedLine("  ![[Specs/Roadmap#Q3 goals|goals]]  ")).toEqual({ target: "Specs/Roadmap", heading: "Q3 goals" });
    expect(parseEmbedLine("![[Sprint plan.board]]")).toEqual({ target: "Sprint plan.board", heading: null });
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
    expect(embedKey({ target: "Roadmap", heading: "Goals" })).toBe(embedKey({ target: "roadmap", heading: "goals" }));
    expect(embedKey({ target: "Roadmap", heading: null })).not.toBe(embedKey({ target: "Roadmap", heading: "Goals" }));
  });
});

describe("findEmbeds", () => {
  it("finds embed lines outside fenced code", () => {
    const text = ["# Status", "![[Roadmap]]", "```", "![[Not this]]", "```", "![[Backlog#Open]]"].join("\n");
    expect(findEmbeds(text)).toEqual([
      { line: 2, ref: { target: "Roadmap", heading: null } },
      { line: 6, ref: { target: "Backlog", heading: "Open" } },
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
    const read = vi.fn(async (target: string) => (target === "Roadmap" ? "# Roadmap\n![[Backlog]]" : null));
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
