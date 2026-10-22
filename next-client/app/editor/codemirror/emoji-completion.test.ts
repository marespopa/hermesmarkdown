import { beforeAll, describe, expect, it } from "vitest";
import { CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { ensureSyntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createEmojiSource } from "./emoji-completion";
import { buildEmojiIndex, loadEmojiIndex, matchEmojis, type EmojiEntry, type EmojiRow } from "./emoji-index";

function getResult(doc: string, explicit = false, pos = doc.length) {
  const state = EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] });
  ensureSyntaxTree(state, state.doc.length);
  return createEmojiSource()(new CompletionContext(state, pos, explicit)) as CompletionResult | null;
}

const labels = (result: CompletionResult | null) => result?.options.map((option) => option.label) ?? [];

let index: EmojiEntry[];
beforeAll(async () => {
  index = await loadEmojiIndex();
});

describe("buildEmojiIndex", () => {
  const rows: EmojiRow[] = [
    ["🔥", "fire", "burn flame hot"],
    ["📅", "calendar", "date"],
    ["📆", "date", "day"],
    ["👍️", "thumbs_up", "+1 thumbsup good"],
  ];

  it("lists the curated shortcodes first, then the rest without repeats or shortcode names", () => {
    const names = buildEmojiIndex(rows).map((entry) => entry.name);
    expect(names.slice(0, 2)).toEqual(["check", "error"]);
    expect(names.filter((name) => name === "fire")).toHaveLength(1);
    expect(names).not.toContain("date");
    expect(names.slice(-2)).toEqual(["calendar", "thumbs_up"]);
  });

  it("gives a curated emoji the full list's keywords", () => {
    const fire = buildEmojiIndex(rows).find((entry) => entry.name === "fire")!;
    expect(matchEmojis([fire], "flame")).toEqual([fire]);
  });
});

describe("matchEmojis", () => {
  const names = (query: string) => matchEmojis(index, query).map((entry) => entry.name);

  it("ranks the exact name, name starts, later-word starts, keywords, then names containing it", () => {
    const fire = names("fire");
    expect(fire[0]).toBe("fire");
    expect(fire.indexOf("firecracker")).toBeGreaterThan(0);
    const up = names("up");
    expect(up.indexOf("up_arrow")).toBeLessThan(up.indexOf("thumbs_up"));
    expect(names("flame")).toContain("fire");
    expect(names("thumbsup")[0]).toBe("thumbs_up");
    expect(names("zzzzqq")).toEqual([]);
  });

  it("lists every emoji for an empty query", () => {
    expect(matchEmojis(index, "")).toHaveLength(index.length);
    expect(index.length).toBeGreaterThan(1800);
  });
});

describe("createEmojiSource", () => {
  it("offers the matching emoji after { and a letter, curated names first", () => {
    const result = getResult("Ship it {ro");

    expect(result?.from).toBe(8);
    expect(labels(result)[0]).toBe("{rocket}");
    expect(labels(result)).toContain("{robot}");
    expect(result?.options[0].displayLabel).toBe("🚀  rocket");
  });

  it("finds an emoji by a later word of its name or by keyword", () => {
    expect(labels(getResult("Nice {thumbs_u"))[0]).toBe("{thumbs_up}");
    expect(labels(getResult("Hot {flame"))).toContain("{fire}");
  });

  it("lists every emoji as soon as { is typed", () => {
    expect(getResult("Note {")?.options).toHaveLength(index.length);
    expect(getResult("Note {", true)?.options).toHaveLength(index.length);
  });

  it("reuses the same options from one key press to the next", () => {
    const first = getResult("{rocke")!.options[0];
    const second = getResult("{rocket")!.options[0];
    expect(second).toBe(first);
  });

  it("leaves {{ template fields, code and unknown names alone", () => {
    expect(getResult("{{da")).toBeNull();
    expect(getResult("`{fi`", false, 4)).toBeNull();
    expect(getResult("```js\nconst a = {fi")).toBeNull();
    expect(getResult("{zzzzqq")).toBeNull();
  });

  it("opens on : at a word's start once a letter follows", () => {
    expect(labels(getResult("Ship it :ro"))[0]).toBe(":rocket:");
    expect(getResult(":fi")?.from).toBe(0);
    expect(getResult("Note:")).toBeNull();
    expect(getResult("Note :")).toBeNull();
    expect(getResult("at 10:3")).toBeNull();
    expect(getResult("word:fi")).toBeNull();
  });

  it("replaces :name and a closing : after the caret with the emoji", () => {
    const doc = "Hot :fi:";
    const result = getResult(doc, false, 7)!;
    const view = new EditorView({ state: EditorState.create({ doc }) });
    const option = result.options.find((entry) => entry.label === ":fire:")!;
    (option.apply as (...args: unknown[]) => void)(view, option, result.from, result.to);

    expect(view.state.doc.toString()).toBe("Hot 🔥 ");
  });

  it("replaces what was typed, and a closing } after the caret, with the emoji", () => {
    const doc = "Hot {fi}";
    const result = getResult(doc, false, 7)!;
    const view = new EditorView({ state: EditorState.create({ doc }) });
    const option = result.options.find((entry) => entry.label === "{fire}")!;
    (option.apply as (...args: unknown[]) => void)(view, option, result.from, result.to);

    expect(view.state.doc.toString()).toBe("Hot 🔥 ");
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
  });
});
