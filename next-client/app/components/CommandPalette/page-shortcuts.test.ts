import { describe, expect, it, vi } from "vitest";
import type { Command } from "./CommandPaletteContext";
import { matchPageShortcut, pageCommand, pageShortcutFor, PAGE_SHORTCUTS } from "./page-shortcuts";

vi.mock("@/app/components/Toastr", () => ({ showErrorToast: vi.fn() }));
vi.mock("@/app/utils/platform", () => ({
  formatShortcut: (letter: string, opts: { alt?: boolean } = {}) => `Ctrl+${opts.alt ? "Alt+" : ""}${letter.toUpperCase()}`,
}));

const keyEvent = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);

describe("page shortcuts", () => {
  it("matches Ctrl+Alt+letter by key off macOS", () => {
    expect(matchPageShortcut(keyEvent({ ctrlKey: true, altKey: true, key: "t", code: "KeyT" }))?.label).toBe("Tasks");
    expect(matchPageShortcut(keyEvent({ ctrlKey: true, altKey: true, key: "g", code: "KeyG" }))).toBeUndefined();
    expect(matchPageShortcut(keyEvent({ ctrlKey: true, key: ",", code: "Comma" }))?.label).toBe("Settings");
  });

  it("leaves AltGr letters alone (Ctrl+Alt+T typing ț)", () => {
    expect(matchPageShortcut(keyEvent({ ctrlKey: true, altKey: true, key: "ț", code: "KeyT" }))).toBeUndefined();
  });

  it("matches Cmd+Option+letter by code on macOS, where Option changes the key", () => {
    expect(matchPageShortcut(keyEvent({ metaKey: true, altKey: true, key: "†", code: "KeyT" }))?.label).toBe("Tasks");
    expect(matchPageShortcut(keyEvent({ metaKey: true, altKey: true, key: "π", code: "KeyP" }))?.label).toBe("Templates");
  });

  it("needs the exact modifiers", () => {
    expect(matchPageShortcut(keyEvent({ altKey: true, key: "t", code: "KeyT" }))).toBeUndefined();
    expect(matchPageShortcut(keyEvent({ ctrlKey: true, key: "t", code: "KeyT" }))).toBeUndefined();
    expect(matchPageShortcut(keyEvent({ ctrlKey: true, altKey: true, shiftKey: true, key: "T", code: "KeyT" }))).toBeUndefined();
    expect(matchPageShortcut(keyEvent({ ctrlKey: true, altKey: true, key: ",", code: "Comma" }))).toBeUndefined();
  });

  it("labels both commands of a page pair and finds the registered one", () => {
    expect(pageShortcutFor("open-tasks-panel")).toBe("Ctrl+Alt+T");
    expect(pageShortcutFor("go-tasks")).toBe("Ctrl+Alt+T");
    expect(pageShortcutFor("open-settings")).toBe("Ctrl+,");
    expect(pageShortcutFor("open-trash")).toBeUndefined();
    const commands = [{ id: "go-templates", label: "Open Templates", action: vi.fn() }] as Command[];
    const templates = PAGE_SHORTCUTS.find((shortcut) => shortcut.label === "Templates")!;
    expect(pageCommand(templates, commands)?.id).toBe("go-templates");
  });
});
