// @vitest-environment node
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

  it("finds links pasted from a web page, with a title or escaped parentheses", () => {
    const titled = 'See [the docs](https://example.com/docs "Docs home") now';
    expect(findLinkAtPos(titled, titled.indexOf("[") + 3)).toMatchObject({
      value: "https://example.com/docs",
      label: "the docs",
      rawString: '[the docs](https://example.com/docs "Docs home")',
    });

    const escaped = "[Mercury](https://en.wikipedia.org/wiki/Mercury_\\(planet\\))";
    expect(findLinkAtPos(escaped, 2)).toMatchObject({
      value: "https://en.wikipedia.org/wiki/Mercury_(planet)",
      end: escaped.length,
    });

    const typed = "[Mercury](https://en.wikipedia.org/wiki/Mercury_(planet))";
    expect(findLinkAtPos(typed, 2)).toMatchObject({
      value: "https://en.wikipedia.org/wiki/Mercury_(planet)",
      end: typed.length,
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

  it("finds Markdown links to vault paths as file links", () => {
    const text = "- **[Editor](./app/editor/README.md)**: Editor data flow";
    const start = text.indexOf("[");
    expect(findLinkAtPos(text, start + 3)).toEqual({
      type: "file",
      value: "./app/editor/README.md",
      label: "Editor",
      start,
      end: start + "[Editor](./app/editor/README.md)".length,
      rawString: "[Editor](./app/editor/README.md)",
    });

    const titled = '[Plan](../plans/road\\(map\\).md#Goals "The plan")';
    expect(findLinkAtPos(titled, 2)).toMatchObject({ type: "file", value: "../plans/road(map).md#Goals", end: titled.length });
  });

  it("leaves images, heading-only and protocol-relative links out", () => {
    expect(findLinkAtPos("![chart](./chart.png)", 3)).toBeNull();
    expect(findLinkAtPos("[Goals](#goals)", 2)).toBeNull();
    expect(findLinkAtPos("[CDN](//cdn.example.com/a.js)", 2)).toBeNull();
  });

  it("returns null outside links and for unsupported URL schemes", () => {
    const text = "[docs](mailto:test@example.com) plain";

    expect(findLinkAtPos(text, text.length)).toBeNull();
    expect(findLinkAtPos(text, 0)).toBeNull();
  });
});