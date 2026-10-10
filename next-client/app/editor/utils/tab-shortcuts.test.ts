// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  isCloseTabShortcut,
  isNewFileShortcut,
  isQuickJotShortcut,
  quickJotShortcutLabel,
  type ShortcutEvent,
} from "./tab-shortcuts";

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

  describe("Quick jot", () => {
    const jot = (overrides: Partial<ShortcutEvent> & { code?: string } = {}) =>
      ({ ...keyboardEvent(overrides), code: overrides.code ?? "" });

    it("matches Ctrl+Alt+J everywhere, and Ctrl+Option+J on Mac by its code", () => {
      expect(isQuickJotShortcut(jot({ ctrlKey: true, altKey: true, key: "j", code: "KeyJ" }), false)).toBe(true);
      expect(isQuickJotShortcut(jot({ ctrlKey: true, altKey: true, key: "J", code: "KeyJ" }), true)).toBe(true);
      expect(isQuickJotShortcut(jot({ ctrlKey: true, altKey: true, key: "∆", code: "KeyJ" }), true)).toBe(true);
    });

    it("leaves AltGr characters off Mac and other modifier mixes alone", () => {
      expect(isQuickJotShortcut(jot({ ctrlKey: true, altKey: true, key: "í", code: "KeyJ" }), false)).toBe(false);
      expect(isQuickJotShortcut(jot({ metaKey: true, altKey: true, key: "j", code: "KeyJ" }), true)).toBe(false);
      expect(isQuickJotShortcut(jot({ ctrlKey: true, shiftKey: true, key: "J", code: "KeyJ" }), false)).toBe(false);
      expect(isQuickJotShortcut(jot({ ctrlKey: true, altKey: true, shiftKey: true, key: "J", code: "KeyJ" }), false)).toBe(false);
      expect(isQuickJotShortcut(jot({ ctrlKey: true, altKey: true, metaKey: true, key: "j", code: "KeyJ" }), false)).toBe(false);
    });

    it("doesn't collide with New file or Close tab", () => {
      const event = jot({ ctrlKey: true, altKey: true, key: "j", code: "KeyJ" });
      expect(isNewFileShortcut(event)).toBe(false);
      expect(isCloseTabShortcut(event)).toBe(false);
      expect(isQuickJotShortcut(jot({ ctrlKey: true, altKey: true, key: "n", code: "KeyN" }), true)).toBe(false);
      expect(isQuickJotShortcut(jot({ ctrlKey: true, altKey: true, key: "w", code: "KeyW" }), true)).toBe(false);
    });

    it("labels the shortcut per platform", () => {
      expect(quickJotShortcutLabel(true)).toBe("⌃⌥J");
      expect(quickJotShortcutLabel(false)).toBe("Ctrl+Alt+J");
    });
  });
});
