import { describe, expect, it } from "vitest";
import { isSidebarToggleShortcut, isTabBarToggleShortcut } from "./EditorShell";

const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);

describe("EditorShell shortcuts", () => {
  it("toggles the tab bar on Ctrl/Cmd+Shift+\\", () => {
    expect(isTabBarToggleShortcut(key({ ctrlKey: true, shiftKey: true, key: "|", code: "Backslash" }))).toBe(true);
    expect(isTabBarToggleShortcut(key({ metaKey: true, shiftKey: true, key: "|", code: "Backslash" }))).toBe(true);
    expect(isTabBarToggleShortcut(key({ ctrlKey: true, key: "\\", code: "Backslash" }))).toBe(false);
    expect(isTabBarToggleShortcut(key({ shiftKey: true, key: "|", code: "Backslash" }))).toBe(false);
  });

  it("keeps Ctrl/Cmd+\\ for the sidebar, not the tab bar", () => {
    expect(isSidebarToggleShortcut(key({ ctrlKey: true, key: "\\", code: "Backslash" }))).toBe(true);
    expect(isSidebarToggleShortcut(key({ ctrlKey: true, shiftKey: true, key: "|", code: "Backslash" }))).toBe(false);
  });
});
