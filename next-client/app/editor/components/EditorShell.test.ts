import { describe, expect, it } from "vitest";
import { isSidebarToggleShortcut, isToolbarToggleShortcut } from "./EditorShell";

const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);

describe("EditorShell shortcuts", () => {
  it("toggles the toolbar on Ctrl/Cmd+Shift+\\", () => {
    expect(isToolbarToggleShortcut(key({ ctrlKey: true, shiftKey: true, key: "|", code: "Backslash" }))).toBe(true);
    expect(isToolbarToggleShortcut(key({ metaKey: true, shiftKey: true, key: "|", code: "Backslash" }))).toBe(true);
    expect(isToolbarToggleShortcut(key({ ctrlKey: true, key: "\\", code: "Backslash" }))).toBe(false);
    expect(isToolbarToggleShortcut(key({ shiftKey: true, key: "|", code: "Backslash" }))).toBe(false);
  });

  it("keeps Ctrl/Cmd+\\ for the sidebar, not the toolbar", () => {
    expect(isSidebarToggleShortcut(key({ ctrlKey: true, key: "\\", code: "Backslash" }))).toBe(true);
    expect(isSidebarToggleShortcut(key({ ctrlKey: true, shiftKey: true, key: "|", code: "Backslash" }))).toBe(false);
  });
});
