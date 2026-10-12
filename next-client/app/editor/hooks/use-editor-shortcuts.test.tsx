import React from "react";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { EditorView } from "@codemirror/view";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_activeEditorView, atom_filesFocusRequested, atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import { useEditorShortcuts } from "./use-editor-shortcuts";

const openSearchPanel = vi.fn();
vi.mock("@codemirror/search", () => ({ openSearchPanel: (view: unknown) => openSearchPanel(view) }));
vi.mock("@/app/components/CommandPalette/CommandPaletteContext", () => ({
  useCommandPalette: () => ({ open: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/editor" }));
let isMobileChrome = false;
vi.mock("@/app/hooks/use-mobile-chrome", () => ({ default: () => isMobileChrome }));

function renderShortcuts(view: EditorView | null, navigateWithGuard = vi.fn()) {
  const store = createStore();
  store.set(atom_activeEditorView, view);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  renderHook(() => useEditorShortcuts({
    navigateWithGuard,
    saveRef: { current: vi.fn() },
    newFileRef: { current: vi.fn() },
    activeTabPath: null,
    closeTabWithAutosave: vi.fn(),
    flush: vi.fn(),
  }), { wrapper });
  return store;
}

function pressCtrlF(init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true, cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
}

describe("useEditorShortcuts: find in note", () => {
  beforeEach(() => openSearchPanel.mockClear());

  it("opens the active note's find panel when focus is outside the editor", () => {
    const view = {} as EditorView;
    renderShortcuts(view);
    const event = pressCtrlF();
    expect(openSearchPanel).toHaveBeenCalledWith(view);
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves Ctrl+F to the browser when no note is open", () => {
    renderShortcuts(null);
    const event = pressCtrlF();
    expect(openSearchPanel).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("doesn't open it twice when the editor already handled the key", () => {
    renderShortcuts({} as EditorView);
    const event = new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true, cancelable: true });
    event.preventDefault();
    window.dispatchEvent(event);
    expect(openSearchPanel).not.toHaveBeenCalled();
  });
});

describe("useEditorShortcuts: Show Files", () => {
  beforeEach(() => {
    isMobileChrome = false;
    window.localStorage.clear();
  });

  const pressShowFiles = () =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "E", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));

  it("shows the sidebar and asks its Files tree for focus on desktop, without navigating", () => {
    const navigateWithGuard = vi.fn();
    const store = renderShortcuts(null, navigateWithGuard);
    pressShowFiles();
    expect(store.get(atom_sidebarOpen)).toBe(true);
    expect(store.get(atom_filesFocusRequested)).toBe(true);
    expect(navigateWithGuard).not.toHaveBeenCalled();
  });

  it("opens the Files page through the unsaved-changes guard on mobile", () => {
    isMobileChrome = true;
    const navigateWithGuard = vi.fn();
    const store = renderShortcuts(null, navigateWithGuard);
    pressShowFiles();
    expect(navigateWithGuard).toHaveBeenCalledWith("/editor/files", "Files");
    expect(store.get(atom_sidebarOpen)).toBe(false);
  });
});
