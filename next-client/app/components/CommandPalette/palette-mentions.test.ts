import { describe, expect, it } from "vitest";
import { collectNoteMentions, type MentionSource } from "./palette-mentions";

function source(text: string): MentionSource {
  const rows: { text: string; from: number }[] = [];
  let from = 0;
  for (const line of text.split("\n")) {
    rows.push({ text: line, from });
    from += line.length + 1;
  }
  return { lines: rows.length, line: (number) => rows[number - 1] };
}

describe("collectNoteMentions", () => {
  it("groups mentions ignoring case, in order of first appearance, with their position", () => {
    const mentions = collectNoteMentions(source("Ping @Dana and @launch.\nLater @dana again"));
    expect(mentions).toEqual([
      { label: "@Dana", count: 2, from: 5 },
      { label: "@launch", count: 1, from: 15 },
    ]);
  });

  it("skips frontmatter, fenced and inline code, emails and annotations", () => {
    const text = "---\nowner: @frontmatter\n---\nUse `@inline` here\n```\n@fenced\n```\nmail a@b.com @done(2026-01-02)\n@real";
    expect(collectNoteMentions(source(text)).map((mention) => mention.label)).toEqual(["@real"]);
  });
});
