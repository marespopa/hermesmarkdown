import { describe, expect, it } from "vitest";
import { tidyNote } from "./tidy-note";

describe("tidyNote tables", () => {
  it("aligns every column to its widest cell", () => {
    const input = ["| Task | Status |", "|---|---|", "| Write the release notes | Done |", "| Ship | Open |"].join("\n");
    expect(tidyNote(input)).toBe([
      "| Task                    | Status |",
      "| ----------------------- | ------ |",
      "| Write the release notes | Done   |",
      "| Ship                    | Open   |",
    ].join("\n"));
  });

  it("keeps column alignment markers", () => {
    const input = ["| Item | Qty | Note |", "|:--|--:|:-:|", "| Pens | 12 | ok |"].join("\n");
    expect(tidyNote(input)).toBe([
      "| Item | Qty | Note |",
      "| :--- | --: | :--: |",
      "| Pens |  12 |  ok  |",
    ].join("\n"));
  });

  it("fills short rows with empty cells and leaves tables with extra cells alone", () => {
    expect(tidyNote("| A | B |\n|---|---|\n| 1 |")).toBe("| A   | B   |\n| --- | --- |\n| 1   |     |");
    const wide = "| A |\n|---|\n| 1 | 2 |";
    expect(tidyNote(wide)).toBe(wide);
  });

  it("does not split on escaped pipes", () => {
    expect(tidyNote("| A | B |\n|---|---|\n| a\\|b | c |")).toBe("| A    | B   |\n| ---- | --- |\n| a\\|b | c   |");
  });

  it("leaves tables inside code fences untouched", () => {
    const input = "```\n| a | b |\n|-|-|\n| 1 | 2 |\n```";
    expect(tidyNote(input)).toBe(input);
  });
});

describe("tidyNote ordered lists", () => {
  it("renumbers a list that skips or repeats numbers", () => {
    expect(tidyNote("1. one\n3. two\n7. three")).toBe("1. one\n2. two\n3. three");
  });

  it("keeps the starting number", () => {
    expect(tidyNote("4. a\n4. b\n9. c")).toBe("4. a\n4. b\n4. c");
    expect(tidyNote("4. a\n6. b\n9. c")).toBe("4. a\n5. b\n6. c");
  });

  it("keeps a list typed as all ones", () => {
    expect(tidyNote("1. a\n1. b\n1. c")).toBe("1. a\n1. b\n1. c");
  });

  it("numbers nested lists on their own", () => {
    expect(tidyNote("1. a\n   1. x\n   5. y\n2. b")).toBe("1. a\n   1. x\n   2. y\n2. b");
  });

  it("starts over after other text", () => {
    expect(tidyNote("1. a\n2. b\n\nText\n\n5. c\n9. d")).toBe("1. a\n2. b\n\nText\n\n5. c\n6. d");
  });

  it("keeps a number whose width would change", () => {
    expect(tidyNote("8. a\n9. b\n5. c")).toBe("8. a\n9. b\n5. c");
  });

  it("leaves fenced code alone", () => {
    const input = "```\n1. a\n5. b\n```";
    expect(tidyNote(input)).toBe(input);
  });
});

describe("tidyNote headings", () => {
  it("adds the blank lines around a heading", () => {
    expect(tidyNote("Intro\n## Title\nBody")).toBe("Intro\n\n## Title\n\nBody");
  });

  it("separates back-to-back headings", () => {
    expect(tidyNote("# A\n## B\n\ntext")).toBe("# A\n\n## B\n\ntext");
  });

  it("needs no gap at the top or under frontmatter", () => {
    expect(tidyNote("# A\n\ntext")).toBe("# A\n\ntext");
    expect(tidyNote("---\ntitle: x\n---\n# A\n\ntext")).toBe("---\ntitle: x\n---\n# A\n\ntext");
  });

  it("ignores # lines in code and frontmatter", () => {
    const input = "---\n# not a heading\n---\ntext\n```sh\n# comment\necho\n```";
    expect(tidyNote(input)).toBe(input);
  });

  it("is idempotent and keeps CRLF line endings", () => {
    const once = tidyNote("a\r\n# T\r\nb");
    expect(once).toBe("a\r\n\r\n# T\r\n\r\nb");
    expect(tidyNote(once)).toBe(once);
  });
});
