import { describe, it, expect } from "vitest";
import { parseVoiceSegment, initialVoiceListState, type VoiceListState } from "./voice-command-parser";

function run(transcript: string, state: VoiceListState = initialVoiceListState) {
  return parseVoiceSegment(transcript, state);
}

describe("parseVoiceSegment", () => {
  it("transcribes ordinary dictation as plain text, not markdown", () => {
    expect(run("bullet buy milk").insertion).toEqual({
      kind: "plain-text",
      text: "Bullet buy milk",
    });
    expect(run("heading two project notes").insertion).toEqual({
      kind: "plain-text",
      text: "Heading two project notes",
    });
  });

  it("capitalizes the first word of a fresh dictated sentence", () => {
    expect(run("this is just a regular sentence").insertion).toEqual({
      kind: "plain-text",
      text: "This is just a regular sentence",
    });
  });

  it("does not re-capitalize mid-sentence dictation carried over in state", () => {
    const state: VoiceListState = { ...initialVoiceListState, capitalizeNext: false };
    expect(run("this continues a sentence", state).insertion).toEqual({
      kind: "plain-text",
      text: "this continues a sentence",
    });
  });

  it("capitalizes the next word after inline sentence-ending punctuation", () => {
    expect(run("i like this period next thought").insertion).toEqual({
      kind: "plain-text",
      text: "I like this. Next thought",
    });
  });

  it("does not capitalize after a comma", () => {
    expect(run("apples comma bananas").insertion).toEqual({
      kind: "plain-text",
      text: "Apples, bananas",
    });
  });

  it("maps a standalone punctuation word to its symbol", () => {
    expect(run("period").insertion).toEqual({ kind: "plain-text", text: "." });
    expect(run("comma").insertion).toEqual({ kind: "plain-text", text: "," });
    expect(run("question mark").insertion).toEqual({ kind: "plain-text", text: "?" });
    expect(run("exclamation point").insertion).toEqual({ kind: "plain-text", text: "!" });
  });

  it("inserts newlines for 'new line' and 'new paragraph'", () => {
    expect(run("new line").insertion).toEqual({ kind: "plain-text", text: "\n" });
    expect(run("new paragraph").insertion).toEqual({ kind: "plain-text", text: "\n\n" });
  });

  it("treats 'new row' and its mishearing 'neuro' as 'new line'", () => {
    expect(run("new row").insertion).toEqual({ kind: "plain-text", text: "\n" });
    expect(run("neuro").insertion).toEqual({ kind: "plain-text", text: "\n" });
  });

  it("emits a delete-last insertion for correction phrases", () => {
    expect(run("scratch that").insertion).toEqual({ kind: "delete-last" });
    expect(run("delete last").insertion).toEqual({ kind: "delete-last" });
    expect(run("undo that").insertion).toEqual({ kind: "delete-last" });
  });

  it("emits a clear-all insertion and resets state", () => {
    const { insertion, nextState } = run("scratch all text");
    expect(insertion).toEqual({ kind: "clear-all" });
    expect(nextState).toEqual(initialVoiceListState);
  });

  it("emits commit / commit-and-stop / stop-listening for session control phrases", () => {
    expect(run("insert this").insertion).toEqual({ kind: "commit" });
    expect(run("commit it").insertion).toEqual({ kind: "commit" });
    expect(run("insert this and stop listening").insertion).toEqual({ kind: "commit-and-stop" });
    expect(run("stop listening").insertion).toEqual({ kind: "stop-listening" });
    expect(run("done listening").insertion).toEqual({ kind: "stop-listening" });
  });

  it("returns a none insertion for an empty transcript", () => {
    expect(run("   ").insertion).toEqual({ kind: "none" });
  });
});
