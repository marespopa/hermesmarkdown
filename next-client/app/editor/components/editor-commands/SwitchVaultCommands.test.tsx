import React from "react";
import { cleanup, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import SwitchVaultCommands from "./SwitchVaultCommands";

const registered = vi.hoisted(() => ({ commands: new Map<string, unknown>() }));
vi.mock("@/app/components/CommandPalette/CommandPaletteContext", () => ({
  useRegisterCommand: (command: { id: string } | null) => {
    if (command) registered.commands.set(command.id, command);
  },
}));
const recents = vi.hoisted(() => ({ all: [] as unknown[], open: vi.fn() }));
vi.mock("../../hooks/use-recent-vaults", () => ({
  useRecentVaults: () => ({ allRecentVaults: recents.all, openRecentVault: recents.open }),
}));
vi.mock("@/app/atoms/vault-atoms", async (importOriginal) => {
  const { atom } = await import("jotai");
  return { ...(await importOriginal<object>()), atom_vaultKey: atom("local:A") };
});

const entry = (name: string, pinned?: boolean) => ({ key: `local:${name}`, kind: "local", name, pinned });
const menu = () => registered.commands.get("switch-vault") as Command;
const setup = () => {
  const store = createStore();
  store.set(atom_vaultKey as never, "local:A");
  render(<Provider store={store}><SwitchVaultCommands /></Provider>);
};

describe("SwitchVaultCommands", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    registered.commands.clear();
  });

  it("is not registered with fewer than two pinned vaults", () => {
    recents.all = [entry("A", true), entry("B")];
    setup();
    expect(menu()).toBeUndefined();
  });

  it("lists only the pinned vaults, the open one disabled", () => {
    recents.all = [entry("A", true), entry("B", true), entry("C")];
    setup();
    expect(menu()).toMatchObject({ label: "Switch Vault…", category: "Vault" });
    expect(menu().subcommands!.map((c) => [c.id, c.label, c.disabledReason])).toEqual([
      ["switch-vault:local:A", "A", "Current vault"],
      ["switch-vault:local:B", "B", undefined],
    ]);
  });

  it("opens the chosen vault", async () => {
    recents.all = [entry("A", true), entry("B", true)];
    setup();
    await menu().subcommands![1].action();
    expect(recents.open).toHaveBeenCalledWith(recents.all[1]);
  });
});
