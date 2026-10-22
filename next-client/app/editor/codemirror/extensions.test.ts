import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { getCM, Vim, vim } from "@replit/codemirror-vim";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildExtensions } from "./extensions";
import { loadVim } from "./vim-loader";

// buildExtensions expects Vim already loaded when vimMode is on.
beforeAll(async () => {
  await loadVim();
});

function createEditor(vimMode: boolean, onOpenActiveHelper = vi.fn(() => false), doc = "A note") {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const vimModeCompartment = new Compartment();
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: buildExtensions({
        wordWrap: true,
        wordWrapCompartment: new Compartment(),
        lineNumbers: true,
        lineNumbersCompartment: new Compartment(),
        showInvisibles: false,
        invisiblesCompartment: new Compartment(),
        vimMode,
        vimModeCompartment,
        flowMode: false,
        flowModeCompartment: new Compartment(),
        onOpenActiveHelperRef: { current: onOpenActiveHelper },
        readOnly: false,
        onFocusChange: vi.fn(),
        slashMenuCallbacksRef: { current: {} as never },
        wikiLinkTriggerRef: { current: null },
      }),
    }),
  });

  return { parent, view, vimModeCompartment };
}

function vimModeOf(view: EditorView) {
  const vimState = getCM(view)?.state.vim;
  if (!vimState) return null;
  return vimState.mode ?? "normal";
}

describe("buildExtensions", () => {
  it("starts Vim in normal mode without a CodeMirror status panel", () => {
    const { parent, view } = createEditor(true);

    expect(vimModeOf(view)).toBe("normal");
    // The mode is shown by VimStatusPill, outside the editor.
    expect(parent.querySelector(".cm-vim-panel")).toBeNull();

    view.destroy();
    parent.remove();
  });

  it("returns from insert mode to normal mode when Escape is pressed", () => {
    const { parent, view } = createEditor(true);

    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "i", bubbles: true, cancelable: true }));
    expect(vimModeOf(view)).toBe("insert");

    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(vimModeOf(view)).toBe("normal");

    view.destroy();
    parent.remove();
  });

  it("returns from insert mode when Vim receives an explicit Escape command", () => {
    const { parent, view } = createEditor(true);

    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "i", bubbles: true, cancelable: true }));
    const cm = getCM(view);
    if (!cm) throw new Error("Vim instance was not mounted");
    Vim.handleKey(cm, "<Esc>", "user");

    expect(vimModeOf(view)).toBe("normal");

    view.destroy();
    parent.remove();
  });

  it("handles Escape after Vim mode is enabled on an existing editor", () => {
    const { parent, view, vimModeCompartment } = createEditor(false);

    view.dispatch({ effects: vimModeCompartment.reconfigure(vim()) });
    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "i", bubbles: true, cancelable: true }));
    expect(vimModeOf(view)).toBe("insert");

    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(vimModeOf(view)).toBe("normal");

    view.destroy();
    parent.remove();
  });

  it("leaves the caret's line unhighlighted", () => {
    const { parent, view } = createEditor(false);
    view.dispatch({ changes: { from: view.state.doc.length, insert: "\nSecond line" } });
    view.dispatch({ selection: { anchor: view.state.doc.length } });

    expect(view.contentDOM.querySelector(".cm-activeLine")).toBeNull();

    view.destroy();
    parent.remove();
  });

  it("does not mount Vim when disabled", () => {
    const { parent, view } = createEditor(false);

    expect(getCM(view)).toBeNull();

    view.destroy();
    parent.remove();
  });

  it("opens the active helper with Ctrl/Cmd+Shift+Enter", () => {
    const onOpenActiveHelper = vi.fn(() => true);
    const { parent, view } = createEditor(false, onOpenActiveHelper);
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });

    view.contentDOM.dispatchEvent(event);

    expect(onOpenActiveHelper).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);

    view.destroy();
    parent.remove();
  });

  it("adds the next match as another selection with Ctrl/Cmd+D", () => {
    const { parent, view } = createEditor(false, undefined, "todo one todo two todo");
    view.dispatch({ selection: { anchor: 0, head: 4 } });

    pressKey(view, { key: "d", ctrlKey: true });
    pressKey(view, { key: "d", ctrlKey: true });

    expect(view.state.selection.ranges.map((range) => [range.from, range.to])).toEqual([[0, 4], [9, 13], [18, 22]]);

    view.destroy();
    parent.remove();
  });

  it("selects every match with Ctrl/Cmd+Shift+L", () => {
    const { parent, view } = createEditor(false, undefined, "todo one todo two todo");
    view.dispatch({ selection: { anchor: 0, head: 4 } });

    // keyCode: CodeMirror maps a shifted letter back to its key through it.
    pressKey(view, { key: "L", keyCode: 76, ctrlKey: true, shiftKey: true });

    expect(view.state.selection.ranges).toHaveLength(3);
    expect(view.state.doc.toString()).toBe("todo one todo two todo");

    view.destroy();
    parent.remove();
  });

  it("wraps the selection as a link with Ctrl/Cmd+Alt+K", () => {
    const { parent, view } = createEditor(false, undefined, "docs");
    view.dispatch({ selection: { anchor: 0, head: 4 } });

    pressKey(view, { key: "k", ctrlKey: true, altKey: true });

    expect(view.state.doc.toString()).toBe("[docs]()");

    view.destroy();
    parent.remove();
  });
});

function pressKey(view: EditorView, init: KeyboardEventInit) {
  view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
}
