import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it, vi } from "vitest";
import { noteEmbedsExtension, setNoteEmbeds, touchesEmbedLines, type EmbedContent } from "./note-embeds";
import { embedKey } from "../utils/note-embeds";

const highlightInto = vi.fn(async () => {});
vi.mock("../utils/highlight-code", () => ({ highlightInto: (...args: unknown[]) => highlightInto(...(args as [])) }));
vi.mock("../utils/rendered-block-cache", () => ({
  currentRenderTheme: () => "default",
  renderBlock: vi.fn(async () => ({ html: "<svg></svg>" })),
}));

function createEditor(doc: string) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const view = new EditorView({ parent, state: EditorState.create({ doc, extensions: noteEmbedsExtension }) });
  return { view, cleanup: () => { view.destroy(); parent.remove(); } };
}

const embeds = (view: EditorView) => Array.from(view.dom.querySelectorAll(".cm-note-embed"));

describe("noteEmbedsExtension", () => {
  it("shows a loading embed under each embed line and keeps the line's text", () => {
    const { view, cleanup } = createEditor("Intro\n![[Roadmap]]\nOutro");
    expect(embeds(view)).toHaveLength(1);
    expect(embeds(view)[0].textContent).toContain("Loading…");
    expect(view.state.doc.toString()).toBe("Intro\n![[Roadmap]]\nOutro");
    cleanup();
  });

  it("renders the note's text once it arrives, and opens it from the title", () => {
    const { view, cleanup } = createEditor("![[Roadmap#Q3]]");
    const open = vi.fn();
    const contents = new Map<string, EmbedContent>([
      [embedKey({ target: "Roadmap", heading: "Q3", kind: "note" }), { kind: "note", path: "Roadmap.md", markdown: "# Roadmap\n## Q3\nShip **sync**\n## Q4\nLater" }],
    ]);
    view.dispatch({ effects: setNoteEmbeds.of({ contents, open }) });

    const body = view.dom.querySelector(".cm-note-embed-body")!;
    expect(body.querySelector("strong")?.textContent).toBe("sync");
    expect(body.textContent).not.toContain("Later");

    (view.dom.querySelector(".cm-note-embed-title") as HTMLElement).click();
    expect(open).toHaveBeenCalledWith("Roadmap");
    cleanup();
  });

  it.each([
    [{ kind: "missing" }, "File not found"],
    [{ kind: "self" }, "A file can't embed itself"],
    [{ kind: "private" }, "Private note"],
  ] as [EmbedContent, string][])("shows a message for %j", (content, text) => {
    const { view, cleanup } = createEditor("![[Roadmap]]");
    view.dispatch({ effects: setNoteEmbeds.of({ contents: new Map([[embedKey({ target: "Roadmap", heading: null, kind: "note" }), content]]), open: null }) });
    expect(embeds(view)[0].textContent).toContain(text);
    cleanup();
  });

  it("escapes the embedded note's HTML", () => {
    const { view, cleanup } = createEditor("![[Roadmap]]");
    const contents = new Map<string, EmbedContent>([[embedKey({ target: "Roadmap", heading: null, kind: "note" }), { kind: "note", path: "Roadmap.md", markdown: "<script>alert(1)</script> text" }]]);
    view.dispatch({ effects: setNoteEmbeds.of({ contents, open: null }) });
    expect(view.dom.querySelector(".cm-note-embed-body script")).toBeNull();
    cleanup();
  });

  it("shows a CSV as a table with a plain title", () => {
    const { view, cleanup } = createEditor("/sales.csv");
    const contents = new Map<string, EmbedContent>([
      [embedKey({ target: "sales.csv", heading: null, kind: "csv" }), { kind: "note", path: "sales.csv", markdown: "| product | status |\n| --- | --- |\n| Sync | shipped |" }],
    ]);
    view.dispatch({ effects: setNoteEmbeds.of({ contents, open: vi.fn() }) });
    expect(view.dom.querySelector(".cm-note-embed-body table td")?.textContent).toBe("Sync");
    expect(view.dom.querySelector("button.cm-note-embed-title")).toBeNull();
    cleanup();
  });

  it("shows an image and a highlighted code file", () => {
    const { view, cleanup } = createEditor("/chart.png\n/auth.ts");
    const contents = new Map<string, EmbedContent>([
      [embedKey({ target: "chart.png", heading: null, kind: "image" }), { kind: "image", path: "assets/chart.png", url: "blob:chart" }],
      [embedKey({ target: "auth.ts", heading: null, kind: "code" }), { kind: "code", path: "auth.ts", code: "const a = 1;", more: 3 }],
    ]);
    view.dispatch({ effects: setNoteEmbeds.of({ contents, open: null }) });
    const image = view.dom.querySelector<HTMLImageElement>(".cm-note-embed-image")!;
    expect(image.getAttribute("src")).toBe("blob:chart");
    expect(image.alt).toBe("chart.png");
    expect(view.dom.querySelector(".cm-note-embed-code code")?.textContent).toBe("const a = 1;");
    expect(view.dom.textContent).toContain("… 3 more lines");
    expect(highlightInto).toHaveBeenCalledWith(expect.any(HTMLElement), "const a = 1;", "auth.ts");
    cleanup();
  });

  it("adds nothing for embeds in code or plain links", () => {
    const { view, cleanup } = createEditor("```\n![[Roadmap]]\n```\n[[Roadmap]]");
    expect(embeds(view)).toHaveLength(0);
    cleanup();
  });
});

describe("touchesEmbedLines", () => {
  const DOC = "Intro text\n![[Roadmap]]\nMore text";
  const change = (from: number, to: number, insert: string) =>
    EditorState.create({ doc: DOC }).update({ changes: { from, to, insert } });

  it("skips edits in ordinary lines", () => {
    expect(touchesEmbedLines(change(2, 2, "x"))).toBe(false);
    expect(touchesEmbedLines(change(DOC.length, DOC.length, " and more"))).toBe(false);
  });

  it("catches edits on embed lines, new embed or fence lines, and removed ones", () => {
    expect(touchesEmbedLines(change(13, 13, "x"))).toBe(true);
    expect(touchesEmbedLines(change(0, 0, "/"))).toBe(true);
    expect(touchesEmbedLines(change(0, 0, "```\n"))).toBe(true);
    expect(touchesEmbedLines(change(11, 24, ""))).toBe(true);
  });

  it("keeps embeds in place while typing elsewhere", () => {
    const { view, cleanup } = createEditor(DOC);
    view.dispatch({ changes: { from: 0, insert: "Longer " } });
    expect(embeds(view)).toHaveLength(1);
    expect(view.state.doc.lineAt(view.posAtDOM(embeds(view)[0])).text).toBe("![[Roadmap]]");
    cleanup();
  });
});
