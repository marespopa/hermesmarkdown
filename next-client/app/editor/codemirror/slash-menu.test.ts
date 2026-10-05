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
import { createSlashMenuSource, insertExpandedTemplate, type SlashMenuCallbacks } from "./slash-menu";

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
    expect(result?.options.map(({ label }) => label)).toEqual(["Code", "Callout", "Collapse"]);
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

  it("opens configured AI Chat and removes the quick command", () => {
    const { callbacks, view } = applyOption("/AI", "AI Chat");

    expect(view.state.doc.toString()).toBe("");
    expect(callbacks.onOpenAIChat).toHaveBeenCalledOnce();
  });

  it("hides AI Chat when AI is not configured", () => {
    const callbacks = makeCallbacks();
    callbacks.onOpenAIChat = undefined;

    expect(getResult("/AI", callbacks).result?.options.map(({ label }) => label)).not.toContain("AI Chat");
  });

  it("matches hyphenated queries like /mark-as-private", () => {
    expect(getResult("/mark-as-private").result?.options.map(({ label }) => label)).toEqual(["Mark as private"]);
    expect(getResult("/mark-as-sensitive").result?.options.map(({ label }) => label)).toEqual(["Mark as sensitive"]);
  });

  it("adds a frontmatter block with the flag when the note has none", () => {
    const { view } = applyOption("Body\n/mark-as-sensitive", "Mark as sensitive");

    expect(view.state.doc.toString()).toBe("---\nsensitive: true\n---\n\nBody\n");
  });

  it("sets the flag in existing frontmatter and leaves other fields alone", () => {
    const { view } = applyOption('---\ntitle: "Note"\nprivate: false\n---\nBody /mark-as-private', "Mark as private");

    expect(view.state.doc.toString()).toBe('---\ntitle: "Note"\nprivate: true\n---\nBody ');
  });

  it("offers Mark as public only on sensitive notes, and hides the mark commands there", () => {
    const labels = (doc: string) => getResult(doc).result?.options.map(({ label }) => label) ?? [];

    expect(labels("/mark")).toEqual(["Mark as sensitive", "Mark as private"]);
    expect(labels("---\ntags: [private]\n---\n/mark")).toEqual(["Mark as public"]);
  });

  it("Mark as public clears every sensitive marker", () => {
    const doc = '---\ntitle: "Note"\nsensitive: true\ntags: [work, private]\n---\nBody /mark-as-public';
    const { view } = applyOption(doc, "Mark as public");

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
