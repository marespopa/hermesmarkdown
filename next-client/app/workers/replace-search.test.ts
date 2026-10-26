// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  applyReplacements,
  buildReplacePattern,
  expandReplacement,
  findMatches,
  textFingerprint,
  type ReplaceOptions,
} from "./replace-search";

const OFF: ReplaceOptions = { matchCase: false, wholeWord: false, regex: false };
const pattern = (find: string, options: Partial<ReplaceOptions> = {}) => {
  const built = buildReplacePattern({ find, ...OFF, ...options });
  if (!built) throw new Error("no pattern");
  return built;
};
const found = (text: string, find: string, options: Partial<ReplaceOptions> = {}) =>
  findMatches(text, pattern(find, options), [], 100);

describe("buildReplacePattern", () => {
  it("escapes regex characters in literal mode", () => {
    expect(found("axb a.b", "a.b").map((m) => m.text)).toEqual(["a.b"]);
  });

  it("is case-insensitive unless Match case", () => {
    expect(found("Foo foo FOO", "foo")).toHaveLength(3);
    expect(found("Foo foo FOO", "foo", { matchCase: true })).toHaveLength(1);
  });

  it("matches whole words only, with accented letters as letters", () => {
    expect(found("cat concat cat_x cat.", "cat", { wholeWord: true }).map((m) => m.from)).toEqual([0, 17]);
    expect(found("café cafés", "café", { wholeWord: true })).toHaveLength(1);
  });

  it("anchors ^ and $ at line ends in regex mode", () => {
    expect(found("a1\nb1\nc", "\\d$", { regex: true })).toHaveLength(2);
    expect(found("x\nfoo", "^foo", { regex: true })).toHaveLength(1);
  });

  it("adds i only without Match case in regex mode", () => {
    expect(pattern("a", { regex: true }).flags).toContain("i");
    expect(pattern("a", { regex: true, matchCase: true }).flags).not.toContain("i");
  });

  it("falls back to no u flag for escapes it rejects", () => {
    const built = pattern("a\\-b", { regex: true });
    expect(built.unicode).toBe(false);
    expect("a-b".match(built)).not.toBeNull();
  });

  it("is null for an invalid pattern and for empty Find", () => {
    expect(buildReplacePattern({ find: "(", ...OFF, regex: true })).toBeNull();
    expect(buildReplacePattern({ find: "", ...OFF })).toBeNull();
  });

  it("doesn't trim Find", () => {
    expect(found("a a", " a").map((m) => m.from)).toEqual([1]);
  });
});

describe("findMatches", () => {
  it("reports offsets, 1-based line and 0-based column", () => {
    const [match] = found("one\ntwo foo\nthree", "foo");
    expect(match).toMatchObject({ ordinal: 0, from: 8, to: 11, line: 2, column: 4, before: "two ", text: "foo", after: "" });
  });

  it("cuts long context to 60 characters with an ellipsis", () => {
    const line = `${"a".repeat(80)}foo${"b".repeat(80)}`;
    const [match] = found(line, "foo");
    expect(match.before).toBe(`…${"a".repeat(60)}`);
    expect(match.after).toBe(`${"b".repeat(60)}…`);
  });

  it("keeps a trailing carriage return out of the context", () => {
    const [match] = found("a foo b\r\nnext", "foo");
    expect(match.after).toBe(" b");
  });

  it("cuts a match spanning lines to its first line", () => {
    const [match] = found("x ab\ncd y", "ab\\ncd", { regex: true });
    expect(match).toMatchObject({ text: "ab…", after: "", full: "ab\ncd", line: 1 });
  });

  it("skips empty matches", () => {
    expect(found("abc", "x*", { regex: true })).toEqual([]);
    expect(found("aab", "a*", { regex: true }).map((m) => m.text)).toEqual(["aa"]);
  });

  it("drops matches overlapping an excluded range and doesn't number them", () => {
    const matches = findMatches("foo foo foo", pattern("foo"), [[4, 7]], 100);
    expect(matches.map((m) => [m.ordinal, m.from])).toEqual([[0, 0], [1, 8]]);
  });

  it("stops at the cap", () => {
    expect(findMatches("a a a a", pattern("a"), [], 2)).toHaveLength(2);
  });

  it("captures groups and named groups in regex mode", () => {
    const [match] = found("ab-12", "(?<word>[a-z]+)-(\\d+)", { regex: true });
    expect(match.groups).toEqual(["ab", "12"]);
    expect(match.named).toEqual({ word: "ab" });
  });
});

describe("expandReplacement", () => {
  const match = { full: "ab-12", groups: ["ab", "12"] as (string | undefined)[], named: { word: "ab" } as Record<string, string | undefined> };

  it("expands $&, $n, $<name> and $$ in regex mode", () => {
    expect(expandReplacement("[$&] $2/$1 $<word> $$", match, true)).toBe("[ab-12] 12/ab ab $");
  });

  it("reads $10 as $1 and 0 when there is one group", () => {
    expect(expandReplacement("$10", { full: "x", groups: ["g"] }, true)).toBe("g0");
  });

  it("reads two digits as one group when it exists", () => {
    const groups = Array.from({ length: 10 }, (_, i) => `g${i + 1}`);
    expect(expandReplacement("$10", { full: "x", groups }, true)).toBe("g10");
  });

  it("keeps unknown tokens literal", () => {
    expect(expandReplacement("$x $0 $9 $<none> $", match, true)).toBe("$x $0 $9 $<none> $");
  });

  it("inserts the template verbatim in literal mode", () => {
    expect(expandReplacement("$1 $& $$", match, false)).toBe("$1 $& $$");
  });
});

describe("applyReplacements", () => {
  const text = "foo bar foo baz foo";

  it("replaces every match", () => {
    expect(applyReplacements(text, pattern("foo"), "X", false, [], new Set())).toEqual({ text: "X bar X baz X", count: 3 });
  });

  it("leaves skipped ordinals alone", () => {
    expect(applyReplacements(text, pattern("foo"), "X", false, [], new Set([1]))).toEqual({ text: "X bar foo baz X", count: 2 });
  });

  it("numbers matches as findMatches does, excluded ranges included", () => {
    const exclude: [number, number][] = [[4, 11]];
    const text2 = "foo\nbar foo\nfoo";
    const ordinals = findMatches(text2, pattern("foo"), exclude, 100).map((m) => m.ordinal);
    expect(ordinals).toEqual([0, 1]);
    const out = applyReplacements(text2, pattern("foo"), "X", false, exclude, new Set([0]));
    expect(out.text).toBe("foo\nbar foo\nX");
  });

  it("expands groups in regex mode", () => {
    expect(applyReplacements("a-1 b-2", pattern("([a-z])-(\\d)", { regex: true }), "$2$1", true, [], new Set()).text).toBe("1a 2b");
  });

  it("returns the text unchanged with a zero count when nothing matches", () => {
    expect(applyReplacements("abc", pattern("x"), "y", false, [], new Set())).toEqual({ text: "abc", count: 0 });
  });
});

describe("textFingerprint", () => {
  it("is equal for equal text and differs on one changed character", () => {
    expect(textFingerprint("hello world")).toBe(textFingerprint("hello world"));
    expect(textFingerprint("hello world")).not.toBe(textFingerprint("hello worle"));
    expect(textFingerprint("abc")).toMatch(/^3:[0-9a-f]+$/);
  });
});
