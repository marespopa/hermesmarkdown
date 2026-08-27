import { describe, expect, it } from "vitest";
import { findLinkAtPos } from "./link-detection";

describe("findLinkAtPos", () => {
  it("finds a Markdown URL link and returns its range and label", () => {
    const text = "Read [the docs](https://example.com/docs) today";
    const start = text.indexOf("[");

    expect(findLinkAtPos(text, start + 5)).toEqual({
      type: "url",
      value: "https://example.com/docs",
      label: "the docs",
      start,
      end: start + "[the docs](https://example.com/docs)".length,
      rawString: "[the docs](https://example.com/docs)",
    });
  });

  it("finds WikiLinks and supports cursor positions at the boundaries", () => {
    const text = "See [[Project Notes]]";
    const start = text.indexOf("[[");
    const end = start + "[[Project Notes]]".length;

    expect(findLinkAtPos(text, start)).toMatchObject({
      type: "wiki",
      value: "Project Notes",
      start,
      end,
      rawString: "[[Project Notes]]",
    });
    expect(findLinkAtPos(text, end)).toMatchObject({ type: "wiki", value: "Project Notes" });
  });

  it("returns null outside links and for unsupported URL schemes", () => {
    const text = "[docs](mailto:test@example.com) plain";

    expect(findLinkAtPos(text, text.length)).toBeNull();
    expect(findLinkAtPos(text, 0)).toBeNull();
  });
});