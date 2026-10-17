import { describe, expect, it } from "vitest";
import { isSidebarToggleShortcut } from "./EditorShell";

const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);

describe("EditorShell shortcuts", () => {
  it("toggles the sidebar on Ctrl/Cmd+\\ and Ctrl/Cmd+Alt+S", () => {
    expect(isSidebarToggleShortcut(key({ ctrlKey: true, key: "\\", code: "Backslash" }))).toBe(true);
    expect(isSidebarToggleShortcut(key({ metaKey: true, altKey: true, key: "ß", code: "KeyS" }))).toBe(true);
    expect(isSidebarToggleShortcut(key({ ctrlKey: true, shiftKey: true, key: "|", code: "Backslash" }))).toBe(false);
    expect(isSidebarToggleShortcut(key({ key: "\\", code: "Backslash" }))).toBe(false);
  });
});
