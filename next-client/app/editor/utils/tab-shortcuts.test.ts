import { describe, expect, it } from "vitest";
import { isCloseTabShortcut, isNewFileShortcut, type ShortcutEvent } from "./tab-shortcuts";

function keyboardEvent(overrides: Partial<ShortcutEvent> = {}): ShortcutEvent {
  return {
    altKey: false,
    ctrlKey: false,
    key: "",
    metaKey: false,
    shiftKey: false,
    ...overrides,
  };
}

describe("tab shortcuts", () => {
  it("recognizes Ctrl+Alt+N for a new file", () => {
    expect(isNewFileShortcut(keyboardEvent({ ctrlKey: true, altKey: true, key: "n" }))).toBe(true);
    expect(isNewFileShortcut(keyboardEvent({ metaKey: true, altKey: true, key: "n" }))).toBe(false);
  });

  it("recognizes Ctrl/Cmd+Alt+W for closing the active tab", () => {
    expect(isCloseTabShortcut(keyboardEvent({ ctrlKey: true, altKey: true, key: "w" }))).toBe(true);
    expect(isCloseTabShortcut(keyboardEvent({ metaKey: true, altKey: true, key: "w" }))).toBe(true);
    expect(isCloseTabShortcut(keyboardEvent({ ctrlKey: true, key: "w" }))).toBe(false);
  });
});
