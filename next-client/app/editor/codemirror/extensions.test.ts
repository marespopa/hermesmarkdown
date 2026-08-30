import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { getCM, Vim, vim } from "@replit/codemirror-vim";
import { describe, expect, it, vi } from "vitest";
import { buildExtensions } from "./extensions";

function createEditor(vimMode: boolean, onOpenActiveHelper = vi.fn(() => false)) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const vimModeCompartment = new Compartment();
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "A note",
      extensions: buildExtensions({
        wordWrap: true,
        lineNumbers: true,
        lineNumbersCompartment: new Compartment(),
        vimMode,
        vimModeCompartment,
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

describe("buildExtensions", () => {
  it("shows Vim mode and pending commands in a bottom status panel when enabled", () => {
    const { parent, view } = createEditor(true);

    expect(parent.querySelector(".cm-vim-panel")).toHaveTextContent("--NORMAL--");

    view.destroy();
    parent.remove();
  });

  it("returns from insert mode to normal mode when Escape is pressed", () => {
    const { parent, view } = createEditor(true);

    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "i", bubbles: true, cancelable: true }));
    expect(parent.querySelector(".cm-vim-panel")).toHaveTextContent("--INSERT--");

    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(parent.querySelector(".cm-vim-panel")).toHaveTextContent("--NORMAL--");

    view.destroy();
    parent.remove();
  });

  it("returns from insert mode when Vim receives an explicit Escape command", () => {
    const { parent, view } = createEditor(true);

    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "i", bubbles: true, cancelable: true }));
    const cm = getCM(view);
    if (!cm) throw new Error("Vim instance was not mounted");
    Vim.handleKey(cm, "<Esc>", "user");

    expect(parent.querySelector(".cm-vim-panel")).toHaveTextContent("--NORMAL--");

    view.destroy();
    parent.remove();
  });

  it("handles Escape after Vim mode is enabled on an existing editor", () => {
    const { parent, view, vimModeCompartment } = createEditor(false);

    view.dispatch({ effects: vimModeCompartment.reconfigure(vim({ status: true })) });
    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "i", bubbles: true, cancelable: true }));
    expect(parent.querySelector(".cm-vim-panel")).toHaveTextContent("--INSERT--");

    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(parent.querySelector(".cm-vim-panel")).toHaveTextContent("--NORMAL--");

    view.destroy();
    parent.remove();
  });

  it("does not render a Vim status panel when disabled", () => {
    const { parent, view } = createEditor(false);

    expect(parent.querySelector(".cm-vim-panel")).toBeNull();

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
});