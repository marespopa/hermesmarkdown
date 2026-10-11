// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ROLLUP_END, ROLLUP_START } from "./render";
import { extractNotes, spliceGenerated } from "./sections";

const sheet = (body: string, eol = "\n") =>
  ["# Week 41", "", "My own line above", ROLLUP_START, body, ROLLUP_END, "", "## Notes", "", "Kept as written  ", ""].join(eol);

describe("spliceGenerated", () => {
  it("replaces only the lines between the markers", () => {
    const before = sheet("old summary\n\n## Done");
    const after = spliceGenerated(before, "new summary\n\n## Done\n- Fix login redirect · [[2026-10-06]]");
    expect(after).toBe(sheet("new summary\n\n## Done\n- Fix login redirect · [[2026-10-06]]"));
    expect(after!.startsWith("# Week 41\n\nMy own line above\n" + ROLLUP_START + "\n")).toBe(true);
    expect(after!.endsWith(ROLLUP_END + "\n\n## Notes\n\nKept as written  \n")).toBe(true);
  });

  it("keeps CRLF line endings and writes the body with them", () => {
    const before = sheet("old", "\r\n");
    expect(spliceGenerated(before, "one\ntwo")).toBe(sheet("one\r\ntwo", "\r\n"));
  });

  it("is null without both markers in order", () => {
    expect(spliceGenerated("# Week 41\n\n## Notes\n", "x")).toBeNull();
    expect(spliceGenerated(`${ROLLUP_START}\nbody\n`, "x")).toBeNull();
    expect(spliceGenerated(`body\n${ROLLUP_END}\n`, "x")).toBeNull();
    expect(spliceGenerated(`${ROLLUP_END}\nbody\n${ROLLUP_START}\n`, "x")).toBeNull();
  });

  it("uses the first start marker and the first end marker after it", () => {
    const content = `${ROLLUP_END}\n${ROLLUP_START}\nold\n${ROLLUP_END}\nnotes\n${ROLLUP_START}\n${ROLLUP_END}\n`;
    expect(spliceGenerated(content, "new")).toBe(`${ROLLUP_END}\n${ROLLUP_START}\nnew\n${ROLLUP_END}\nnotes\n${ROLLUP_START}\n${ROLLUP_END}\n`);
  });

  it("returns the same text when the body is unchanged", () => {
    const content = sheet("same");
    expect(spliceGenerated(content, "same")).toBe(content);
  });
});

describe("extractNotes", () => {
  it("takes the Notes after the end marker, up to the next ## heading, trimmed", () => {
    const content = [
      ROLLUP_START, "## Notes", "generated, not mine", ROLLUP_END, "",
      "## Notes", "", "Shipped the billing beta.", "### Next", "Pricing review", "", "## Later", "not notes",
    ].join("\n");
    expect(extractNotes(content)).toBe("Shipped the billing beta.\n### Next\nPricing review");
  });

  it("uses the first Notes heading anywhere when there's no end marker", () => {
    expect(extractNotes("# Week\n\n## notes\nA decision\n# Other")).toBe("A decision");
  });

  it("is empty without a Notes heading", () => {
    expect(extractNotes(`${ROLLUP_START}\nx\n${ROLLUP_END}\n\nJust text`)).toBe("");
  });
});
