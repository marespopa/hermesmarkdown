import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useFocusTrap } from "./useOverlay";

// jsdom never computes layout, so getFocusable()'s `offsetParent !== null`
// visibility check always fails unless we fake it.
function makeVisible(el: HTMLElement) {
  Object.defineProperty(el, "offsetParent", { get: () => document.body, configurable: true });
}

describe("useFocusTrap", () => {
  let outsideButton: HTMLButtonElement;
  let panel: HTMLDivElement;
  let panelButton: HTMLButtonElement;
  let editor: HTMLDivElement;

  beforeEach(() => {
    outsideButton = document.createElement("button");
    outsideButton.textContent = "opener";
    document.body.appendChild(outsideButton);

    panel = document.createElement("div");
    panelButton = document.createElement("button");
    panelButton.textContent = "panel action";
    panel.appendChild(panelButton);
    document.body.appendChild(panel);
    makeVisible(panelButton);

    // Stands in for the CM6/ProseMirror editor root that a confirm action
    // (e.g. DatePickerCallout's onSelectDate) explicitly refocuses.
    editor = document.createElement("div");
    editor.tabIndex = 0;
    document.body.appendChild(editor);
  });

  afterEach(() => {
    outsideButton.remove();
    panel.remove();
    editor.remove();
  });

  it("restores focus to the opener when it's still trapped inside the panel on close", () => {
    outsideButton.focus();

    const { rerender } = renderHook(({ isOpen }) => useFocusTrap(panel, isOpen), {
      initialProps: { isOpen: true },
    });

    // Simulate focus having landed inside the panel (Tab nav, or the trap's
    // own initial-focus effect) while it's open.
    act(() => panelButton.focus());
    expect(document.activeElement).toBe(panelButton);

    act(() => rerender({ isOpen: false }));

    expect(document.activeElement).toBe(outsideButton);
  });

  it("does not steal focus back when a confirm action already refocused something else", () => {
    outsideButton.focus();

    const { rerender } = renderHook(({ isOpen }) => useFocusTrap(panel, isOpen), {
      initialProps: { isOpen: true },
    });

    act(() => panelButton.focus());
    expect(document.activeElement).toBe(panelButton);

    // The date picker's onSelectDate calls view.focus() synchronously,
    // moving focus onto the editor, before the state update that flips
    // isOpen to false is even processed.
    act(() => editor.focus());
    expect(document.activeElement).toBe(editor);

    act(() => rerender({ isOpen: false }));

    // Regression check: the old unconditional `previouslyFocused.current.focus()`
    // in the cleanup would have yanked focus back to outsideButton here,
    // dropping the editor's focused state (and, in CM6, its `cm-focused`
    // class — which is what made the caret disappear).
    expect(document.activeElement).toBe(editor);
  });

  it("does nothing when the panel is null", () => {
    outsideButton.focus();
    const { rerender } = renderHook(({ isOpen }) => useFocusTrap(null, isOpen), {
      initialProps: { isOpen: true },
    });
    expect(document.activeElement).toBe(outsideButton);
    act(() => rerender({ isOpen: false }));
    expect(document.activeElement).toBe(outsideButton);
  });
});
