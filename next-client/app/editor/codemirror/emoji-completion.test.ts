import { describe, expect, it } from "vitest";
import { CompletionContext } from "@codemirror/autocomplete";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { ensureSyntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createEmojiSource, matchEmojis } from "./emoji-completion";

function getResult(doc: string, explicit = false, pos = doc.length) {
  const state = EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] });
  ensureSyntaxTree(state, state.doc.length);
  return createEmojiSource()(new CompletionContext(state, pos, explicit));
}

describe("matchEmojis", () => {
  it("lists names starting with the query, then names containing it", () => {
    expect(matchEmojis("i").map(([name]) => name)).toEqual(["idea", "info", "fix", "question", "pin", "link", "fire"]);
    expect(matchEmojis("fire")).toEqual([["fire", "🔥 "]]);
    expect(matchEmojis("zzz")).toEqual([]);
  });
});

describe("createEmojiSource", () => {
  it("offers the matching emoji after { and a letter", () => {
    const result = getResult("Ship it {ro");

    expect(result?.from).toBe(8);
    expect(result?.options.map((option) => option.label)).toEqual(["{rocket}", "{error}"]);
    expect(result?.options[0].displayLabel).toBe("🚀  rocket");
  });

  it("waits for a letter after a bare { unless the menu was asked for", () => {
    expect(getResult("Note {")).toBeNull();
    expect(getResult("Note {", true)?.options).toHaveLength(18);
  });

  it("leaves {{ template fields, code and unknown names alone", () => {
    expect(getResult("{{da")).toBeNull();
    expect(getResult("`{fi`", false, 4)).toBeNull();
    expect(getResult("```js\nconst a = {fi")).toBeNull();
    expect(getResult("{nothing")).toBeNull();
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
