import React from "react";
import { cleanup, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_vaultKey } from "@/app/atoms/vault-atoms";
import { atom_recentVaultsDialogOpen } from "@/app/atoms/ui-atoms";
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

const entry = (name: string, pinned?: boolean, openedAt = 0) => ({
  key: `local:${name}:${openedAt}`,
  kind: "local" as const,
  name,
  pinned,
  openedAt,
  lastOpened: openedAt,
  handle: {} as unknown as FileSystemDirectoryHandle,
});
const menu = () => registered.commands.get("switch-vault") as Command;
const setup = () => {
  const store = createStore();
  store.set(atom_vaultKey as never, "local:A:1");
  render(
    <Provider store={store}>
      <SwitchVaultCommands />
    </Provider>,
  );
  return store;
};

describe("SwitchVaultCommands", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    registered.commands.clear();
  });

  it("is not registered when there are 0 or 1 recent vaults", () => {
    recents.all = [];
    setup();
    expect(menu()).toBeUndefined();
    cleanup();
    registered.commands.clear();
    recents.all = [entry("A", false, 1)];
    setup();
    expect(menu()).toBeUndefined();
  });

  it("is registered when 2+ vaults exist", () => {
    recents.all = [entry("A", false, 1), entry("B", false, 2)];
    setup();
    expect(menu()).toBeDefined();
    expect(menu().label).toBe("Switch Vault…");
  });

  it("sorts pinned vaults first, followed by recency", () => {
    recents.all = [
      entry("A", false, 100),
      entry("B", true, 10),
      entry("C", false, 200),
      entry("D", true, 50),
    ];
    setup();
    const labels = menu().subcommands!.filter((c) => c.id !== "switch-vault:view-all").map((c) => c.label);
    // Pinned first (D 50, B 10) then recency (C 200, A 100) -> B and D are pinned, D newer than B
    expect(labels).toEqual(["D", "B", "C", "A"]);
  });

  it("caps listed subcommands at 6 vaults", () => {
    recents.all = Array.from({ length: 8 }, (_, i) => entry(`V${i}`, false, i));
    setup();
    // 6 vaults + view-all
    expect(menu().subcommands!.filter((c) => c.id.startsWith("switch-vault:local"))).toHaveLength(6);
  });

  it('includes "View All Recent Vaults…" when >6 and triggers the dialog atom when executed', async () => {
    recents.all = Array.from({ length: 7 }, (_, i) => entry(`V${i}`, false, i));
    const store = setup();
    const viewAll = menu().subcommands!.find((c) => c.id === "switch-vault:view-all");
    expect(viewAll).toBeDefined();
    expect(viewAll!.label).toBe("View All Recent Vaults…");
    await viewAll!.action();
    expect(store.get(atom_recentVaultsDialogOpen)).toBe(true);
  });

  it("disables the active vault's subcommand with \"Current vault\"", () => {
    recents.all = [entry("A", false, 1), entry("B", false, 2)];
    // entry A has key local:A:1 which matches vaultKey
    setup();
    const current = menu().subcommands!.find((c) => c.id === "switch-vault:local:A:1");
    expect(current!.disabledReason).toBe("Current vault");
  });

  it("opens the chosen vault", async () => {
    recents.all = [entry("A", false, 1), entry("B", false, 2)];
    setup();
    const target = menu().subcommands!.find((c) => c.id === "switch-vault:local:B:2")!;
    await target.action();
    expect(recents.open).toHaveBeenCalledWith(recents.all[1]);
  });
});
