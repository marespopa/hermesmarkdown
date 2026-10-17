import React, { useEffect } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Provider, createStore } from "jotai";
import { atom_darkTheme, atom_focusMode, atom_lightTheme, atom_theme, atom_wordWrap } from "@/app/atoms/ui-atoms";
import SettingsCommands from "@/app/editor/settings/components/SettingsCommands";
import AppCommands from "./AppCommands";
import { CommandPaletteProvider, type Command, useCommandPalette } from "./CommandPaletteContext";

const push = vi.fn();
let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

let commands: Command[] = [];
function Probe() {
  const registered = useCommandPalette().commands;
  useEffect(() => {
    commands = registered;
  }, [registered]);
  return null;
}

function renderCommands(store = createStore()) {
  render(
    <Provider store={store}>
      <CommandPaletteProvider>
        <AppCommands />
        <SettingsCommands />
        <Probe />
      </CommandPaletteProvider>
    </Provider>,
  );
  return store;
}

const command = (id: string) => commands.find((candidate) => candidate.id === id);

describe("AppCommands and SettingsCommands", () => {
  beforeEach(() => {
    localStorage.clear();
    pathname = "/";
    push.mockClear();
  });
  afterEach(cleanup);

  it("names the landing page command as the website, outside the editor only", () => {
    renderCommands();
    expect(command("open-website")?.label).toBe("Open HermesMarkdown Website");
    expect(command("go-home")).toBeUndefined();
    cleanup();

    pathname = "/editor/settings";
    renderCommands();
    expect(command("open-website")).toBeUndefined();
    expect(command("open-documentation")?.label).toBe("Open Documentation");
  });

  it("offers one command per theme and disables the current one", () => {
    const store = createStore();
    store.set(atom_theme, "dark");
    renderCommands(store);

    expect(["set-theme-light", "set-theme-dark", "set-theme-system"].map((id) => command(id)?.label)).toEqual([
      "Theme: Light",
      "Theme: Dark",
      "Theme: System",
    ]);
    expect(command("set-theme-dark")?.disabledReason).toBe("Current theme");
    expect(command("toggle-theme")).toBeUndefined();

    act(() => { void command("set-theme-light")?.action(); });
    expect(store.get(atom_theme)).toBe("light");
  });

  it("offers three palettes for each mode and disables the current ones", () => {
    const store = createStore();
    store.set(atom_lightTheme, "paper");
    renderCommands(store);

    for (const id of ["solarized", "paper", "plain"]) expect(command(`set-light-theme-${id}`)).toBeDefined();
    for (const id of ["nord", "ink", "graphite"]) expect(command(`set-dark-theme-${id}`)).toBeDefined();
    expect(command("set-light-theme-paper")?.label).toBe("Light Theme: Paper");
    expect(command("set-light-theme-paper")?.disabledReason).toBe("Current light theme");
    expect(command("set-dark-theme-ink")?.disabledReason).toBe("Current dark theme");

    act(() => { void command("set-dark-theme-graphite")?.action(); });
    expect(store.get(atom_darkTheme)).toBe("graphite");
    expect(store.get(atom_lightTheme)).toBe("paper");
  });

  it("uses verb-object names for the global commands", () => {
    renderCommands();
    expect(command("open-settings")?.label).toBe("Open Settings");
    expect(command("show-keyboard-shortcuts")?.label).toBe("Show Keyboard Shortcuts");
    expect(command("toggle-word-wrap")?.label).toBe("Toggle Word Wrap");
    expect(command("toggle-line-numbers")?.label).toBe("Toggle Line Numbers");
  });

  it("toggles word wrap and sets the Focus level from the palette", () => {
    const store = createStore();
    store.set(atom_wordWrap, true);
    renderCommands(store);

    act(() => { void command("toggle-word-wrap")?.action(); });
    expect(store.get(atom_wordWrap)).toBe(false);

    expect(command("toggle-flow-mode")).toBeUndefined();
    expect(command("toggle-hide-chrome-while-typing")).toBeUndefined();
    expect(command("set-focus-hide")).toBeUndefined();
    expect(["set-focus-off", "set-focus-dim", "set-focus-sentence"].map((id) => command(id)?.label)).toEqual([
      "Focus: Off",
      "Focus: Dim other paragraphs",
      "Focus: Dim other sentences",
    ]);
    expect(command("set-focus-off")?.disabledReason).toBe("Current setting");
    act(() => { void command("set-focus-dim")?.action(); });
    expect(store.get(atom_focusMode)).toBe("dim");
  });

  it("offers only the autosave modes that exist", () => {
    renderCommands();
    expect(command("set-autosave-afterDelay")?.label).toBe("Autosave: After Delay");
    expect(command("set-autosave-manual")?.label).toBe("Autosave: Manual Only");
    expect(command("set-autosave-onFocusChange")).toBeUndefined();
  });
});
