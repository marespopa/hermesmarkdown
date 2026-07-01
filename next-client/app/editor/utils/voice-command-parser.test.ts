import { describe, it, expect } from "vitest";
import { parseVoiceSegment, initialVoiceListState, type VoiceListState } from "./voice-command-parser";

function run(transcript: string, state: VoiceListState = initialVoiceListState) {
  return parseVoiceSegment(transcript, state);
}

describe("parseVoiceSegment", () => {
  it("parses word-form heading levels", () => {
    const { insertion } = run("heading two Project Notes");
    expect(insertion).toEqual({ kind: "markdown", text: "## Project Notes" });
  });

  it("parses digit-form and short-form headings", () => {
    expect(run("heading 3 Notes").insertion).toEqual({ kind: "markdown", text: "### Notes" });
    expect(run("h1 Title").insertion).toEqual({ kind: "markdown", text: "# Title" });
  });

  it("parses a plain bullet", () => {
    expect(run("bullet buy milk").insertion).toEqual({ kind: "markdown", text: "- buy milk" });
  });

  it("resolves a wikilink phrase nested inside a bullet", () => {
    expect(run("bullet link to dashboard").insertion).toEqual({
      kind: "markdown",
      text: "- [[dashboard]]",
    });
  });

  it("indents a bullet and persists the indent level", () => {
    const { insertion, nextState } = run("indent bullet link to daily note");
    expect(insertion).toEqual({ kind: "markdown", text: "  - [[daily note]]" });
    expect(nextState.indentLevel).toBe(1);

    const second = run("bullet another item", nextState);
    expect(second.insertion).toEqual({ kind: "markdown", text: "  - another item" });
  });

  it("outdent clamps at zero", () => {
    const { nextState } = run("outdent", initialVoiceListState);
    expect(nextState.indentLevel).toBe(0);
  });

  it("supports task incomplete and complete variants", () => {
    expect(run("task incomplete buy groceries").insertion).toEqual({
      kind: "markdown",
      text: "- [ ] buy groceries",
    });
    expect(run("task complete review PR").insertion).toEqual({
      kind: "markdown",
      text: "- [x] review PR",
    });
  });

  it("opens a code block, stays in code mode, then closes it", () => {
    const opened = run("code block python");
    expect(opened.insertion).toMatchObject({ kind: "markdown", text: "```python\n\n```", cursorOffset: 10 });
    expect(opened.nextState.inCodeBlock).toBe(true);

    const literal = run("bullet this should not be parsed", opened.nextState);
    expect(literal.insertion).toEqual({ kind: "plain-text", text: "bullet this should not be parsed" });
    expect(literal.nextState.inCodeBlock).toBe(true);

    const closed = run("end code block", literal.nextState);
    expect(closed.insertion).toEqual({ kind: "markdown", text: "\n```\n" });
    expect(closed.nextState.inCodeBlock).toBe(false);
  });

  it("parses a bare wiki link command", () => {
    expect(run("wiki link to dashboard").insertion).toEqual({
      kind: "markdown",
      text: "[[dashboard]]",
    });
  });

  it("opens the link dialog for a bare 'link' command", () => {
    expect(run("link").insertion).toEqual({ kind: "open-link-dialog" });
  });

  it("parses bold, italic and horizontal rule", () => {
    expect(run("bold important").insertion).toEqual({ kind: "markdown", text: "**important**" });
    expect(run("italic important").insertion).toEqual({ kind: "markdown", text: "*important*" });
    expect(run("horizontal rule").insertion).toEqual({ kind: "markdown", text: "\n---\n" });
  });

  it("falls back to plain text for unrecognized speech", () => {
    expect(run("this is just a regular sentence").insertion).toEqual({
      kind: "plain-text",
      text: "this is just a regular sentence",
    });
  });

  it("maps punctuation words to symbols", () => {
    expect(run("period").insertion).toEqual({ kind: "markdown", text: "." });
    expect(run("comma").insertion).toEqual({ kind: "markdown", text: "," });
    expect(run("question mark").insertion).toEqual({ kind: "markdown", text: "?" });
    expect(run("exclamation point").insertion).toEqual({ kind: "markdown", text: "!" });
  });

  it("inserts newlines for 'new line' and 'new paragraph'", () => {
    expect(run("new line").insertion).toEqual({ kind: "markdown", text: "\n" });
    expect(run("new paragraph").insertion).toEqual({ kind: "markdown", text: "\n\n" });
  });

  it("emits a delete-last insertion for correction phrases", () => {
    expect(run("scratch that").insertion).toEqual({ kind: "delete-last" });
    expect(run("delete last").insertion).toEqual({ kind: "delete-last" });
    expect(run("undo that").insertion).toEqual({ kind: "delete-last" });
  });

  it("parses numbered list items, including indented ones", () => {
    expect(run("numbered item first step").insertion).toEqual({
      kind: "markdown",
      text: "1. first step",
    });
    const { insertion, nextState } = run("indent numbered item nested step");
    expect(insertion).toEqual({ kind: "markdown", text: "  1. nested step" });
    expect(nextState.indentLevel).toBe(1);
  });

  it("parses blockquotes, inline code and strikethrough", () => {
    expect(run("quote to be or not to be").insertion).toEqual({
      kind: "markdown",
      text: "> to be or not to be",
    });
    expect(run("inline code const x").insertion).toEqual({ kind: "markdown", text: "`const x`" });
    expect(run("strikethrough not needed").insertion).toEqual({
      kind: "markdown",
      text: "~~not needed~~",
    });
  });

  it("indents tasks like it indents bullets", () => {
    expect(run("indent task incomplete sub todo").insertion).toEqual({
      kind: "markdown",
      text: "  - [ ] sub todo",
    });
    expect(run("indent task complete sub done").insertion).toEqual({
      kind: "markdown",
      text: "  - [x] sub done",
    });
  });

  it("tracks a multi-turn indent/outdent/bullet sequence", () => {
    let state = initialVoiceListState;
    state = run("indent bullet one", state).nextState;
    state = run("indent bullet two", state).nextState;
    expect(state.indentLevel).toBe(2);
    state = run("outdent", state).nextState;
    expect(state.indentLevel).toBe(1);
    const final = run("bullet three", state);
    expect(final.insertion).toEqual({ kind: "markdown", text: "  - three" });
  });
});
