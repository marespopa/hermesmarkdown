import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_pins } from "@/app/atoms/pin-atoms";
import { seedPins } from "@/app/atoms/pin-atoms.test-utils";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import PinCommands from "./PinCommands";

const registered = vi.hoisted(() => ({ commands: new Map<string, unknown>() }));
vi.mock("@/app/components/CommandPalette/CommandPaletteContext", () => ({
  useRegisterCommand: (command: { id: string } | null) => {
    if (command) registered.commands.set(command.id, command);
  },
}));
const mobileChrome = vi.hoisted(() => ({ value: false }));
vi.mock("@/app/hooks/use-mobile-chrome", () => ({ default: () => mobileChrome.value }));

const vault = { name: "Notes" } as unknown as FileSystemDirectoryHandle;
const menu = () => registered.commands.get("pin-page") as Command;

const setup = (hasVault = true) => {
  const store = createStore();
  if (hasVault) {
    store.set(atom_vaultHandle, vault);
    seedPins(store, [{ kind: "page", target: "tasks", icon: null }]);
  }
  render(<Provider store={store}><PinCommands /></Provider>);
  return store;
};

describe("PinCommands", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
    registered.commands.clear();
    mobileChrome.value = false;
  });

  it("lists the six pages, an already pinned one disabled", () => {
    setup();
    expect(menu()).toMatchObject({ label: "Pin Page to Sidebar…", category: "Workspace", disabledReason: undefined });
    expect(menu().subcommands!.map((command) => [command.id, command.label])).toEqual([
      ["pin-page:files", "All Notes"],
      ["pin-page:tags", "Tags"],
      ["pin-page:tasks", "Tasks"],
      ["pin-page:templates", "Templates"],
      ["pin-page:trash", "Trash"],
      ["pin-page:settings", "Settings"],
    ]);
    expect(menu().subcommands!.find((command) => command.id === "pin-page:tasks")!.disabledReason).toBe("Already pinned");
    expect(menu().subcommands!.find((command) => command.id === "pin-page:trash")!.disabledReason).toBeUndefined();
  });

  it("pins a page when run", async () => {
    const store = setup();
    await menu().subcommands!.find((command) => command.id === "pin-page:trash")!.action();
    await waitFor(() => expect(store.get(atom_pins)).toEqual([
      { kind: "page", target: "tasks", icon: null },
      { kind: "page", target: "trash", icon: null },
    ]));
  });

  it("is disabled without a vault, and on mobile", () => {
    setup(false);
    expect(menu().disabledReason).toBe("Open a vault first");

    cleanup();
    registered.commands.clear();
    mobileChrome.value = true;
    setup();
    expect(menu().disabledReason).toBe("The sidebar isn't shown on this screen");
  });
});
