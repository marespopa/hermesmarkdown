import { act, fireEvent, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_pageOnly } from "@/app/atoms/ui-atoms";
import { isPageOnlyShortcut, usePageOnly } from "./use-page-only";

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: toast }));

const marked = () => document.documentElement.hasAttribute("data-page-only");

function setup(enabled = true) {
  const store = createStore();
  const Wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const hook = renderHook(({ on }) => usePageOnly(on), { wrapper: Wrapper, initialProps: { on: enabled } });
  return { store, ...hook };
}

const shortcut = (init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(window, { code: "KeyZ", key: "z", ctrlKey: true, altKey: true, ...init });

beforeEach(() => toast.mockClear());
afterEach(() => document.documentElement.removeAttribute("data-page-only"));

describe("usePageOnly", () => {
  it("marks the page while the mode is on and clears it when it is off", () => {
    const { store } = setup();
    expect(marked()).toBe(false);
    act(() => store.set(atom_pageOnly, true));
    expect(marked()).toBe(true);
    act(() => store.set(atom_pageOnly, false));
    expect(marked()).toBe(false);
  });

  it("says once, as it turns on, how to leave", () => {
    const { store } = setup();
    act(() => store.set(atom_pageOnly, true));
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toMatch(/No Distraction Mode · .*Z or the top edge to leave/);
    act(() => store.set(atom_pageOnly, false));
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("tells a touch screen to tap the top edge instead of pressing a shortcut", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(hover: none)" }));
    const { store } = setup();
    act(() => store.set(atom_pageOnly, true));
    expect(toast.mock.calls[0][0]).toBe("No Distraction Mode · tap the top edge to leave");
    vi.unstubAllGlobals();
  });

  it("toggles on Ctrl/Cmd+Alt+Z and ignores nearby keys", () => {
    const { store } = setup();
    shortcut();
    expect(store.get(atom_pageOnly)).toBe(true);
    shortcut({ shiftKey: true });
    shortcut({ altKey: false });
    shortcut({ code: "KeyX" });
    expect(store.get(atom_pageOnly)).toBe(true);
    shortcut({ ctrlKey: false, metaKey: true });
    expect(store.get(atom_pageOnly)).toBe(false);
  });

  it("keeps the mode but hides nothing where there is nothing to hide", () => {
    const { store, rerender } = setup(false);
    act(() => store.set(atom_pageOnly, true));
    expect(marked()).toBe(false);
    expect(toast).not.toHaveBeenCalled();
    rerender({ on: true });
    expect(marked()).toBe(true);
  });

  it("clears the mark on unmount", () => {
    const { store, unmount } = setup();
    act(() => store.set(atom_pageOnly, true));
    unmount();
    expect(marked()).toBe(false);
  });
});

describe("isPageOnlyShortcut", () => {
  it("needs Ctrl or Cmd with Alt, no Shift, and an untouched event", () => {
    const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", { code: "KeyZ", ...init });
    expect(isPageOnlyShortcut(key({ ctrlKey: true, altKey: true }))).toBe(true);
    expect(isPageOnlyShortcut(key({ metaKey: true, altKey: true }))).toBe(true);
    expect(isPageOnlyShortcut(key({ altKey: true }))).toBe(false);
    expect(isPageOnlyShortcut(key({ ctrlKey: true }))).toBe(false);
    expect(isPageOnlyShortcut(key({ ctrlKey: true, altKey: true, shiftKey: true }))).toBe(false);
    const taken = key({ ctrlKey: true, altKey: true, cancelable: true });
    taken.preventDefault();
    expect(isPageOnlyShortcut(taken)).toBe(false);
  });
});
