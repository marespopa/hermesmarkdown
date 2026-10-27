import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { atom_companionOpen } from "@/app/atoms/companion-atoms";
import { atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import { CommandPaletteProvider, useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import ShellCommands from "./ShellCommands";

function Probe({ onCommands }: { onCommands: (ids: Record<string, ReturnType<typeof useCommandPalette>["commands"][number]>) => void }) {
  const { commands } = useCommandPalette();
  React.useEffect(() => {
    onCommands(Object.fromEntries(commands.map((command) => [command.id, command])));
  });
  return null;
}

function setup(hasCompanion: boolean) {
  const store = createStore();
  store.set(atom_sidebarOpen, true);
  store.set(atom_companionOpen, false);
  const seen: { current: Record<string, { label: string; action: () => unknown }> } = { current: {} };
  render(
    <Provider store={store}>
      <CommandPaletteProvider>
        <ShellCommands hasCompanion={hasCompanion} />
        <Probe onCommands={(commands) => { seen.current = commands; }} />
      </CommandPaletteProvider>
    </Provider>,
  );
  return { store, seen };
}

describe("ShellCommands", () => {
  it("shows and hides the sidebar", async () => {
    const { store, seen } = setup(true);
    expect(seen.current["toggle-sidebar"].label).toBe("Hide Sidebar");
    seen.current["toggle-sidebar"].action();
    expect(store.get(atom_sidebarOpen)).toBe(false);
  });

  it("shows and hides the AI companion", () => {
    const { store, seen } = setup(true);
    expect(seen.current["toggle-companion"].label).toBe("Show AI Companion");
    seen.current["toggle-companion"].action();
    expect(store.get(atom_companionOpen)).toBe(true);
  });

  it("offers no companion command without AI set up", () => {
    const { seen } = setup(false);
    expect(seen.current["toggle-companion"]).toBeUndefined();
  });
});
