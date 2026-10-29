import { describe, expect, it, vi } from "vitest";
import { CompletionContext } from "@codemirror/autocomplete";
import { EditorSelection, EditorState } from "@codemirror/state";
import { undo, history } from "@codemirror/commands";
import { EditorView } from "@codemirror/view";
import {
  CODE_BLOCK_TEMPLATE_CONTENT,
  CURSOR_SENTINEL,
  DATE_EDITOR_SENTINEL,
  LINK_EDITOR_SENTINEL,
  TASK_EDITOR_SENTINEL,
  WIKILINK_EDITOR_SENTINEL,
} from "../components/constants";
import { createSlashMenuSource, insertExpandedTemplate, matchEmbedFiles, type SlashMenuCallbacks } from "./slash-menu";
import { CALLOUT_TYPE_MENU_EVENT } from "./callout-type";

function makeCallbacks(): SlashMenuCallbacks {
  return {
    onOpenLinkDialog: vi.fn(),
    onOpenWikiLinkDialog: vi.fn(),
    onOpenDatePicker: vi.fn(),
    onOpenTaskDialog: vi.fn(),
    onOpenAIChat: vi.fn(),
    onFrontmatterWizard: vi.fn(),
    onCodeBlockInserted: vi.fn(),
  };
}

function getResult(doc: string, callbacks = makeCallbacks()) {
  const state = EditorState.create({ doc });
  const source = createSlashMenuSource({ current: callbacks });
  return { callbacks, result: source(new CompletionContext(state, doc.length, true)) };
}

function makeView(doc: string) {
  return new EditorView({ state: EditorState.create({ doc }) });
}

function applyOption(doc: string, label: string, callbacks = makeCallbacks()) {
  const { result } = getResult(doc, callbacks);
  const option = result?.options.find((entry) => entry.label === label);
  if (!result || !option) throw new Error(`Missing slash-menu option: ${label}`);
  const view = makeView(doc);
  if (typeof option.apply !== "function") throw new Error(`Invalid slash-menu option: ${label}`);
  option.apply(view, option, result.from, result.to ?? result.from);
  return { callbacks, result, view };
}

describe("createSlashMenuSource", () => {
  it("returns matching completions at a slash command boundary", () => {
    const { result } = getResult("before /co");

    expect(result).not.toBeNull();
    expect(result?.from).toBe(7);
    expect(result?.to).toBe(10);
    expect(result?.filter).toBe(false);
    // Names starting with the query first, then names merely holding its letters.
    expect(result?.options.map(({ label }) => label)).toEqual(["Code", "Collapse", "Callout"]);
  });

  it("groups the whole list into sections, basic blocks first, and drops them for a search", () => {
    const all = getResult("/").result?.options ?? [];
    const section = (label: string) => {
      const value = all.find((option) => option.label === label)?.section;
      return typeof value === "string" ? value : value?.name;
    };

    expect(all[0].label).toBe("Text");
    expect(section("Heading 1")).toBe("Basic blocks");
    expect(section("Link")).toBe("Insert");
    expect(section("Frontmatter")).toBe("File");
    expect(getResult("/head").result?.options.every((option) => option.section === undefined)).toBe(true);
  });

  it.each([
    ["/h1", "Heading 1"],
    ["/h2", "Heading 2"],
    ["/todo", "To-do list"],
    ["/ul", "Bulleted list"],
    ["/hr", "Divider"],
    ["/yaml", "Frontmatter"],
    ["/url", "Link"],
    ["/list", "Bulleted list"],
  ])("puts the command an alias or word names first: %s", (doc, label) => {
    expect(getResult(doc).result?.options[0].label).toBe(label);
  });

  it("finds a command by a word of its description", () => {
    expect(getResult("/checkbox").result?.options.map(({ label }) => label)).toContain("To-do list");
    expect(getResult("/quotation").result?.options.map(({ label }) => label)).toEqual(["Quote"]);
  });

  it.each([
    ["/h1", "Heading 1", "# ", 2],
    ["Intro /h2", "Heading 2", "## Intro", 8],
    ["- item /todo", "To-do list", "- [ ] item", 10],
    ["  - nested /ol", "Numbered list", "  1. nested", 11],
    ["# Title /text", "Text", "Title", 5],
    ["> said /quote", "Quote", "> said", 6],
  ])("turns the line into the block: %s", (doc, label, expected, caret) => {
    const { view } = applyOption(doc, label);

    expect(view.state.doc.toString()).toBe(expected);
    expect(view.state.selection.main.head).toBe(caret);
  });

  it("undoes a block command in one step", () => {
    const view = new EditorView({ state: EditorState.create({ doc: "Intro /h1", extensions: [history()] }) });
    const { result } = getResult("Intro /h1");
    const option = result!.options.find((entry) => entry.label === "Heading 1")!;
    (option.apply as (...args: unknown[]) => void)(view, option, result!.from, result!.to);
    undo(view);

    expect(view.state.doc.toString()).toBe("Intro /h1");
  });

  it.each([
    ["/divider", "---\n", 4],
    ["Para\n/hr", "Para\n\n---\n", 10],
    ["Para /hr", "Para\n\n---\n", 10],
  ])("puts a divider on a line of its own: %j", (doc, expected, caret) => {
    const { view } = applyOption(doc, "Divider");

    expect(view.state.doc.toString()).toBe(expected);
    expect(view.state.selection.main.head).toBe(caret);
  });

  it("leaves a { where the Emoji entry was typed, for the emoji menu", () => {
    vi.useFakeTimers();
    try {
      const { view } = applyOption("Ship it /emoji", "Emoji");
      expect(view.state.doc.toString()).toBe("Ship it {");
      expect(view.state.selection.main.head).toBe(9);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores invalid boundaries, paths, spaced queries, and unknown commands", () => {
    for (const doc of ["text/code", "/Users/me", "./notes/", "text /two words", "/does-not-exist"]) {
      expect(getResult(doc).result).toBeNull();
    }
  });

  it("inserts a plain template and places the cursor at its sentinel", () => {
    const { view } = applyOption("/Mermaid", "Mermaid");

    expect(view.state.doc.toString()).toBe("\n```mermaid\n\n```\n");
    expect(view.state.selection.main.head).toBe(12);
  });

  it.each([
    ["Link", LINK_EDITOR_SENTINEL, "onOpenLinkDialog"],
    ["WikiLink", WIKILINK_EDITOR_SENTINEL, "onOpenWikiLinkDialog"],
    ["Date", DATE_EDITOR_SENTINEL, "onOpenDatePicker"],
    ["Task", TASK_EDITOR_SENTINEL, "onOpenTaskDialog"],
  ] as const)("routes the %s template to its callback", (label, _sentinel, callbackName) => {
    const { callbacks } = applyOption(`/${label}`, label);
    expect(callbacks[callbackName]).toHaveBeenCalledWith({ from: 0, to: label.length + 1 });
  });

  it("handles table, frontmatter, and code block templates", () => {
    const table = applyOption("/Table", "Table");
    expect(table.view.state.doc.toString()).toContain("| Header 1 | Header 2 | Header 3 |");
    expect(table.view.state.selection.main.head).toBe(2);

    const frontmatterCallbacks = makeCallbacks();
    const frontmatter = applyOption("/Frontmatter", "Frontmatter", frontmatterCallbacks);
    expect(frontmatter.view.state.doc.toString()).toBe("");
    expect(frontmatterCallbacks.onFrontmatterWizard).toHaveBeenCalledOnce();

    const code = applyOption("/Code", "Code");
    expect(code.view.state.doc.toString()).toBe(CODE_BLOCK_TEMPLATE_CONTENT.replace(CURSOR_SENTINEL, ""));
    expect(code.view.state.selection.main.head).toBe(4);
    expect(code.callbacks.onCodeBlockInserted).toHaveBeenCalledWith(4);
  });

  it("offers the callout type menu once the key press that inserted a callout is over", () => {
    vi.useFakeTimers();
    const { result } = getResult("/Callout");
    const view = makeView("/Callout");
    document.body.appendChild(view.dom);
    const listener = vi.fn();
    view.dom.addEventListener(CALLOUT_TYPE_MENU_EVENT, listener);
    const option = result?.options.find((entry) => entry.label === "Callout");
    (option?.apply as (view: EditorView, completion: unknown, from: number, to: number) => void)(view, option, 0, 8);
    expect(view.state.doc.toString()).toBe("> [!note]\n> ");
    expect(listener).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ pos: 9 });
    view.destroy();
    vi.useRealTimers();
  });

  it("opens configured AI Chat and removes the quick command", () => {
    const { callbacks, view } = applyOption("/AI", "Ask AI");

    expect(view.state.doc.toString()).toBe("");
    expect(callbacks.onOpenAIChat).toHaveBeenCalledOnce();
  });

  it("offers Embed file only with notes to embed", () => {
    const labels = (callbacks: SlashMenuCallbacks) => getResult("/embed", callbacks).result?.options.map(({ label }) => label) ?? [];
    expect(labels(makeCallbacks())).not.toContain("Embed file");
    expect(labels({ ...makeCallbacks(), embedFiles: () => [] })).not.toContain("Embed file");
    expect(labels({ ...makeCallbacks(), embedFiles: () => ["specs/Roadmap.md"] })).toContain("Embed file");
  });

  it("leaves a bare / on its own line for Embed file, breaking the line around it", () => {
    vi.useFakeTimers();
    const callbacks = { ...makeCallbacks(), embedFiles: () => ["specs/Roadmap.md"] };
    const alone = applyOption("/embed", "Embed file", callbacks).view;
    expect(alone.state.doc.toString()).toBe("/");
    expect(alone.state.selection.main.head).toBe(1);

    const doc = "Intro /embed";
    const { result } = getResult(doc, callbacks);
    const option = result!.options.find((entry) => entry.label === "Embed file")!;
    const view = makeView(doc + " outro");
    (option.apply as (...args: unknown[]) => void)(view, option, result!.from, result!.to ?? result!.from);
    expect(view.state.doc.toString()).toBe("Intro \n/\n outro");
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("hides AI Chat when AI is not configured", () => {
    const callbacks = makeCallbacks();
    callbacks.onOpenAIChat = undefined;

    expect(getResult("/AI", callbacks).result?.options.map(({ label }) => label)).not.toContain("Ask AI");
  });

  it("finds the one privacy entry by /privacy, /private, /public or a hyphenated label", () => {
    const labels = (doc: string) => getResult(doc).result?.options.map(({ label }) => label) ?? [];
    for (const query of ["/privacy", "/private", "/mark-as-private"]) {
      expect(labels(query)).toEqual(["Privacy: mark as private"]);
    }
    expect(labels("---\nprivate: true\n---\n/public")).toEqual(["Privacy: mark as public"]);
  });

  it("adds a frontmatter block with the flag when the note has none", () => {
    const { view } = applyOption("Body\n/privacy", "Privacy: mark as private");

    expect(view.state.doc.toString()).toBe("---\nprivate: true\n---\n\nBody\n");
  });

  it("sets the flag in existing frontmatter and leaves other fields alone", () => {
    const { view } = applyOption('---\ntitle: "Note"\nprivate: false\n---\nBody /privacy', "Privacy: mark as private");

    expect(view.state.doc.toString()).toBe('---\ntitle: "Note"\nprivate: true\n---\nBody ');
  });

  it("offers mark as public only on private notes, and mark as private only on the others", () => {
    const labels = (doc: string) => getResult(doc).result?.options.map(({ label }) => label) ?? [];

    expect(labels("/privacy")).toEqual(["Privacy: mark as private"]);
    expect(labels("---\ntags: [private]\n---\n/privacy")).toEqual(["Privacy: mark as public"]);
  });

  it("mark as public clears both spellings of the private marker", () => {
    const doc = '---\ntitle: "Note"\nprivate: true\ntags: [work, private]\n---\nBody /privacy';
    const { view } = applyOption(doc, "Privacy: mark as public");

    expect(view.state.doc.toString()).toBe('---\ntitle: "Note"\ntags: [work]\n---\nBody ');
  });

  it("offers Template for /tpl and /template only when vault templates can be inserted", () => {
    const labels = (doc: string, callbacks: SlashMenuCallbacks) =>
      getResult(doc, callbacks).result?.options.map(({ label }) => label) ?? [];
    const withVault = { ...makeCallbacks(), onInsertVaultTemplate: vi.fn() };

    expect(labels("/tpl", withVault)).toContain("Template");
    expect(labels("/template", withVault)).toContain("Template");
    expect(labels("/tpl", makeCallbacks())).not.toContain("Template");
    expect(labels("/template", makeCallbacks())).not.toContain("Template");
  });

  it("removes the trigger and opens the vault template picker", () => {
    const callbacks = { ...makeCallbacks(), onInsertVaultTemplate: vi.fn() };
    const { view } = applyOption("Intro /tpl", "Template", callbacks);

    expect(view.state.doc.toString()).toBe("Intro ");
    expect(callbacks.onInsertVaultTemplate).toHaveBeenCalledOnce();
  });

  it("offers Save as template only when the note can be saved as one", () => {
    const labels = (callbacks: SlashMenuCallbacks) =>
      getResult("/save", callbacks).result?.options.map(({ label }) => label) ?? [];
    const callbacks = { ...makeCallbacks(), onSaveAsTemplate: vi.fn() };

    expect(labels(callbacks)).toContain("Save as template");
    expect(labels(makeCallbacks())).not.toContain("Save as template");
    const { view } = applyOption("Body /save", "Save as template", callbacks);
    expect(view.state.doc.toString()).toBe("Body ");
    expect(callbacks.onSaveAsTemplate).toHaveBeenCalledOnce();
  });

  it("offers Template field for /field only in a template note", () => {
    const labels = (callbacks: SlashMenuCallbacks) =>
      getResult("/field", callbacks).result?.options.map(({ label }) => label) ?? [];

    expect(labels({ ...makeCallbacks(), onInsertTemplateField: vi.fn() })).toContain("Template field");
    expect(labels(makeCallbacks())).not.toContain("Template field");
  });

  it("removes the trigger and opens the template field menu", () => {
    const callbacks = { ...makeCallbacks(), onInsertTemplateField: vi.fn() };
    const { view } = applyOption("Owner: /field", "Template field", callbacks);

    expect(view.state.doc.toString()).toBe("Owner: ");
    expect(callbacks.onInsertTemplateField).toHaveBeenCalledOnce();
  });
  it("offers no Daily or Jot entries", () => {
    const labels = (doc: string, callbacks: SlashMenuCallbacks) =>
      getResult(doc, callbacks).result?.options.map(({ label }) => label) ?? [];

    expect(labels("/daily", makeCallbacks())).not.toContain("Daily");
    expect(labels("/jot", makeCallbacks())).not.toContain("Jot");
  });
});

describe("insertExpandedTemplate", () => {
  function viewWithHistory(doc: string, caret: number) {
    return new EditorView({
      state: EditorState.create({ doc, extensions: [history()], selection: EditorSelection.cursor(caret) }),
    });
  }

  it("inserts the text as is (no shortcodes), with the caret at the cursor offset", () => {
    const view = viewWithHistory("AB", 1);
    insertExpandedTemplate(view, "2026-10-04 {date}\nnext", 11);

    expect(view.state.doc.toString()).toBe("A2026-10-04 {date}\nnextB");
    expect(view.state.selection.main.head).toBe(12);
  });

  it("puts the caret at the end without a cursor and undoes in one step", () => {
    const view = viewWithHistory("", 0);
    insertExpandedTemplate(view, "# Title\nBody", null);

    expect(view.state.selection.main.head).toBe("# Title\nBody".length);
    undo(view);
    expect(view.state.doc.toString()).toBe("");
  });
});

describe("slash menu note embeds", () => {
  const PATHS = ["Roadmap.md", "specs/Road trip.md", "Backlog.md", "archive/Old roadmap.md"];

  it("ranks names starting with the query, then containing it, then paths", () => {
    expect(matchEmbedFiles(PATHS, "road")).toEqual(["Roadmap.md", "specs/Road trip.md", "archive/Old roadmap.md"]);
    expect(matchEmbedFiles(PATHS, "specs")).toEqual(["specs/Road trip.md"]);
    expect(matchEmbedFiles(PATHS, "Roadmap.md")).toEqual(["Roadmap.md", "archive/Old roadmap.md"]);
    expect(matchEmbedFiles(PATHS, "")).toEqual([]);
  });

  it("offers matching notes at the start of a line and inserts their path", () => {
    const callbacks = { ...makeCallbacks(), embedFiles: () => PATHS };
    const { result } = getResult("/road t", callbacks);
    expect(result?.options.map((option) => option.label)).toEqual(["Road trip"]);

    const view = makeView("/road t");
    const option = result!.options[0];
    (option.apply as (view: EditorView, completion: unknown, from: number, to: number) => void)(view, option, result!.from, "/road t".length);
    expect(view.state.doc.toString()).toBe("/specs/Road trip.md");
    view.destroy();
  });

  it("offers no notes after text on the line", () => {
    const callbacks = { ...makeCallbacks(), embedFiles: () => PATHS };
    const { result } = getResult("See /road", callbacks);
    expect(result?.options.map((option) => option.label) ?? []).not.toContain("Roadmap");
  });

  it("shows Board only when a board can be created", () => {
    expect(getResult("/boa").result?.options.map((option) => option.label) ?? []).not.toContain("Board");
    const onInsertBoard = vi.fn();
    const callbacks = { ...makeCallbacks(), onInsertBoard };
    const { result } = getResult("/boa", callbacks);
    const board = result!.options.find((option) => option.label === "Board")!;
    const view = makeView("/boa");
    (board.apply as (view: EditorView, completion: unknown, from: number, to: number) => void)(view, board, 0, 4);
    expect(view.state.doc.toString()).toBe("");
    expect(onInsertBoard).toHaveBeenCalled();
    view.destroy();
  });
});
