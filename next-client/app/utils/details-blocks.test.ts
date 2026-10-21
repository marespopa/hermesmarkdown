import { describe, expect, it } from "vitest";
import { findDetailsBlocks, outermostDetailsBlocks } from "./details-blocks";

describe("findDetailsBlocks", () => {
  it("finds the separate-line form", () => {
    const doc = "<details>\n<summary>Title</summary>\n\nBody\n\n</details>\nAfter";
    const [b] = findDetailsBlocks(doc);
    expect(b.open).toBe(false);
    expect(b.openLine).toBe(0);
    expect(b.headerLine).toBe(1);
    expect(b.summary?.text).toBe("Title");
    expect(doc.slice(b.bodyFrom, b.closeFrom)).toBe("\n\nBody\n\n");
    expect(doc.slice(b.headerLineEnd - 10, b.headerLineEnd)).toBe("</summary>");
    expect(doc.slice(b.closeLineEnd)).toBe("\nAfter");
    expect(doc.slice(b.summary!.textFrom, b.summary!.textTo)).toBe("Title");
  });

  it("finds the inline form", () => {
    const doc = "<details><summary>T</summary>\nBody\n</details>";
    const [b] = findDetailsBlocks(doc);
    expect(b.headerLine).toBe(b.openLine);
    expect(b.summary?.text).toBe("T");
    expect(doc.slice(b.summary!.tagFrom, b.summary!.textFrom)).toBe("<summary>");
  });

  it("reads the open attribute", () => {
    const open = (tag: string) => findDetailsBlocks(`${tag}\n<summary>T</summary>\nx\n</details>`)[0].open;
    expect(open("<details open>")).toBe(true);
    expect(open('<DETAILS OPEN="open">')).toBe(true);
    expect(open('<details class="x" open>')).toBe(true);
    expect(open('<details data-open="1">')).toBe(false);
    expect(open("<details>")).toBe(false);
  });

  it("finds a summary past blank lines, and none for a multi-line summary", () => {
    expect(findDetailsBlocks("<details>\n\n\n<summary>T</summary>\nx\n</details>")[0].headerLine).toBe(3);
    const [b] = findDetailsBlocks("<details>\n<summary>Long\ntitle</summary>\nx\n</details>");
    expect(b.summary).toBeNull();
    expect(b.headerLine).toBe(0);
  });

  it("strips inner tags and decodes entities in the summary text", () => {
    expect(findDetailsBlocks("<details><summary><b>A</b> &amp; B</summary>\nx\n</details>")[0].summary?.text).toBe("A & B");
  });

  it("finds nested blocks, outer first", () => {
    const doc = "<details><summary>O</summary>\n<details><summary>I</summary>\nx\n</details>\n</details>";
    const blocks = findDetailsBlocks(doc);
    expect(blocks.map((b) => b.summary?.text)).toEqual(["O", "I"]);
    expect(outermostDetailsBlocks(blocks).map((b) => b.summary?.text)).toEqual(["O"]);
  });

  it("drops an unclosed outer block but keeps a closed inner one", () => {
    const blocks = findDetailsBlocks("<details><summary>O</summary>\n<details><summary>I</summary>\nx\n</details>\n");
    expect(blocks.map((b) => b.summary?.text)).toEqual(["I"]);
  });

  it("ignores fences, frontmatter, quotes and look-alike tags", () => {
    const tail = "<summary>T</summary>\nx\n</details>";
    expect(findDetailsBlocks("```\n<details>\n" + tail + "\n```")).toEqual([]);
    expect(findDetailsBlocks("---\nk: v\n<details>\n" + tail + "\n---\nText")).toEqual([]);
    expect(findDetailsBlocks("> <details>\n" + tail)).toEqual([]);
    expect(findDetailsBlocks("<detailsx>\n" + tail)).toEqual([]);
    expect(findDetailsBlocks("<details-foo>\n" + tail)).toEqual([]);
  });

  it("closes a one-line block on its own line", () => {
    const [b] = findDetailsBlocks("<details><summary>A</summary>x</details>");
    expect(b.closeLine).toBe(b.headerLine);
  });
});
