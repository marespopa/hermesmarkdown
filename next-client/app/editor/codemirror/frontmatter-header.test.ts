import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { history, undo } from "@codemirror/commands";
import { frontmatterSpacer } from "./frontmatter-block";
import { headingFolding, toggleHeadingFold } from "./heading-fold";
import {
  FRONTMATTER_CHIP_EVENT,
  frontmatterHeader,
  frontmatterHeaderShown,
  requestFrontmatterChipAtCaret,
  setFrontmatterValue,
  setHeaderFocus,
  type FrontmatterChipRequest,
} from "./frontmatter-header";

const DOC = "---\ntype: project\nstatus: draft\ndue_date: 2026-11-15\n---\nBody text";
const CLOSE = DOC.indexOf("\n---\nBody") + 4;
const BODY = DOC.indexOf("Body");

const views: EditorView[] = [];
function makeView(doc = DOC, caret = BODY) {
  const view = new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor: caret },
      extensions: [markdown({ base: markdownLanguage }), history(), frontmatterSpacer, headingFolding, frontmatterHeader],
    }),
    parent: document.body,
  });
  views.push(view);
  return view;
}
const focus = (view: EditorView, on: boolean) => view.dispatch({ effects: setHeaderFocus.of(on) });
const header = (view: EditorView) => view.contentDOM.querySelector(".cm-frontmatter-header");
const chip = (view: EditorView, kind: string) => view.contentDOM.querySelector<HTMLElement>(`.cm-fm-chip[data-kind="${kind}"]`)!;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 25));
});
afterEach(() => {
  vi.useRealTimers();
  for (const view of views.splice(0)) view.destroy();
});

describe("frontmatter header display", () => {
  it("shows chips instead of the YAML while the editor is unfocused", () => {
    const view = makeView(DOC, 0);
    expect(header(view)).not.toBeNull();
    expect(view.contentDOM.textContent).not.toContain("status: draft");
    expect(header(view)).toHaveAttribute("role", "toolbar");
    expect(Array.from(view.contentDOM.querySelectorAll(".cm-fm-chip")).map((c) => c.textContent))
      .toEqual(["project", "draft", "Due Nov 15"]);
  });

  it("shows chips while focused with the caret in the body", () => {
    const view = makeView();
    focus(view, true);
    expect(header(view)).not.toBeNull();
    expect(frontmatterHeaderShown(view.state)).toBe(true);
  });

  it("reveals the raw YAML while focused with the caret in the block, at 0 and at the closing edge", () => {
    const view = makeView();
    focus(view, true);
    view.dispatch({ selection: { anchor: DOC.indexOf("status") } });
    expect(header(view)).toBeNull();
    expect(view.contentDOM.textContent).toContain("status: draft");
    view.dispatch({ selection: { anchor: BODY } });
    expect(header(view)).not.toBeNull();
    view.dispatch({ selection: { anchor: 0 } });
    expect(header(view)).toBeNull();
    view.dispatch({ selection: { anchor: CLOSE } });
    expect(header(view)).toBeNull();
  });

  it("reveals the YAML for a select-all, and brings the header back on blur", () => {
    const view = makeView();
    focus(view, true);
    view.dispatch({ selection: { anchor: 0, head: DOC.length } });
    expect(header(view)).toBeNull();
    focus(view, false);
    expect(header(view)).not.toBeNull();
  });

  it("reveals the YAML again when undo restores a selection inside", () => {
    const view = makeView();
    focus(view, true);
    view.dispatch({ selection: { anchor: DOC.indexOf("draft") + 5 } });
    view.dispatch({ changes: { from: DOC.indexOf("draft"), to: DOC.indexOf("draft") + 5, insert: "review" }, userEvent: "input.type" });
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    expect(header(view)).not.toBeNull();
    undo(view);
    expect(header(view)).toBeNull();
    expect(view.state.doc.toString()).toBe(DOC);
  });

  it("follows an external change of the file", () => {
    const view = makeView(DOC, 0);
    expect(chip(view, "status").textContent).toBe("draft");
    const from = DOC.indexOf("draft");
    view.dispatch({ changes: { from, to: from + 5, insert: "done" }, userEvent: "input.external" });
    expect(chip(view, "status").textContent).toBe("done");
  });

  it("gives way to the fold placeholder and returns on unfold", () => {
    const view = makeView();
    toggleHeadingFold(view, 0);
    expect(header(view)).toBeNull();
    expect(view.contentDOM.querySelector(".cm-frontmatterFoldPlaceholder")).not.toBeNull();
    toggleHeadingFold(view, 0);
    expect(header(view)).not.toBeNull();
  });

  it("shows malformed YAML raw even while unfocused", () => {
    const view = makeView("---\nmeta:\n  sub: x\n---\nBody", 0);
    expect(header(view)).toBeNull();
    expect(view.contentDOM.textContent).toContain("sub: x");
  });
});

describe("frontmatter header chips", () => {
  it("moves the caret to the key's value for a field chip", () => {
    const view = makeView();
    chip(view, "type").click();
    expect(view.state.selection.main.head).toBe(DOC.indexOf("project"));
  });

  it("asks for a menu for a status chip without moving the caret", () => {
    const view = makeView();
    const seen: FrontmatterChipRequest[] = [];
    view.dom.addEventListener(FRONTMATTER_CHIP_EVENT, (event) => seen.push((event as CustomEvent<FrontmatterChipRequest>).detail));
    chip(view, "status").click();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ kind: "status", key: "status", value: "draft" });
    expect(view.state.selection.main.head).toBe(BODY);
    chip(view, "date").click();
    expect(seen[1]).toMatchObject({ kind: "date", key: "due_date", value: "2026-11-15" });
  });

  it("moves between chips with the arrow keys and returns to the editor on Escape", () => {
    const view = makeView();
    const [first, second] = Array.from(view.contentDOM.querySelectorAll<HTMLElement>(".cm-fm-chip"));
    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(second);
    second.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.activeElement).toBe(view.contentDOM);
    expect(view.state.selection.main.head).toBe(BODY);
  });
});

describe("setFrontmatterValue", () => {
  it("rewrites only the value, as one undo step", () => {
    const view = makeView();
    expect(setFrontmatterValue(view, "status", "done")).toBe(true);
    expect(view.state.doc.toString()).toBe(DOC.replace("draft", "done"));
    undo(view);
    expect(view.state.doc.toString()).toBe(DOC);
  });

  it("keeps quotes and a trailing comment", () => {
    const view = makeView("---\nstatus: \"draft\" # wip\n---\nBody", 0);
    setFrontmatterValue(view, "status", "done");
    expect(view.state.doc.toString()).toBe("---\nstatus: \"done\" # wip\n---\nBody");
  });

  it("does not merge with typing right before it", () => {
    const view = makeView();
    view.dispatch({ changes: { from: view.state.doc.length, insert: "!" }, userEvent: "input.type" });
    setFrontmatterValue(view, "status", "done");
    undo(view);
    expect(view.state.doc.toString()).toBe(`${DOC}!`);
  });

  it("returns false for a missing key", () => {
    expect(setFrontmatterValue(makeView(), "owner", "x")).toBe(false);
  });
});

describe("requestFrontmatterChipAtCaret", () => {
  it("opens the status menu on a status line only", () => {
    const view = makeView();
    const seen: FrontmatterChipRequest[] = [];
    view.dom.addEventListener(FRONTMATTER_CHIP_EVENT, (event) => seen.push((event as CustomEvent<FrontmatterChipRequest>).detail));
    view.dispatch({ selection: { anchor: DOC.indexOf("project") } });
    expect(requestFrontmatterChipAtCaret(view)).toBe(false);
    view.dispatch({ selection: { anchor: DOC.indexOf("draft") + 2 } });
    expect(requestFrontmatterChipAtCaret(view)).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ kind: "status", key: "status", value: "draft" });
    view.dispatch({ selection: { anchor: BODY } });
    expect(requestFrontmatterChipAtCaret(view)).toBe(false);
  });
});
