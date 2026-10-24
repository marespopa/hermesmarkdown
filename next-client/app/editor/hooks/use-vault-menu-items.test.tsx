import React from "react";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it, vi } from "vitest";
import { atom_recentVaultsDialogOpen } from "@/app/atoms/ui-atoms";
import type { RecentVault } from "@/app/services/recent-vaults";
import { useVaultMenuItems } from "./use-vault-menu-items";

const recents = vi.hoisted(() => ({ list: [] as RecentVault[], openRecentVault: vi.fn() }));
vi.mock("./use-recent-vaults", () => ({
  useRecentVaults: () => ({ recentVaults: recents.list, allRecentVaults: recents.list, openRecentVault: recents.openRecentVault }),
}));
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ openVault: vi.fn(), isVaultSupported: true, isBrowserVaultSupported: false }),
}));

const vault = (name: string, pinned?: boolean): RecentVault => ({
  key: `local:${name}`,
  kind: "local",
  name,
  handle: { name } as FileSystemDirectoryHandle,
  openedAt: 0,
  ...(pinned ? { pinned } : {}),
});

function setup(list: RecentVault[]) {
  recents.list = list;
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return { store, ...renderHook(() => useVaultMenuItems(), { wrapper }) };
}

describe("useVaultMenuItems", () => {
  it("lists only the pinned vaults, then the actions and Recent Vaults…", () => {
    const { result } = setup([vault("Projects", true), vault("Archive")]);
    expect(result.current.map((item) => item.label)).toEqual(["Projects", "Open Vault…", "Create Vault…", "Recent Vaults…"]);
    expect(result.current[1].divider).toBe(true);
    expect(result.current[3].divider).toBe(true);
    expect(result.current[0].icon).toBeTruthy();
  });

  it("opens the Recent Vaults dialog", () => {
    const { result, store } = setup([vault("Archive")]);
    result.current.find((item) => item.label === "Recent Vaults…")?.onClick();
    expect(store.get(atom_recentVaultsDialogOpen)).toBe(true);
  });

  it("leaves Recent Vaults… out with no recents", () => {
    const { result } = setup([]);
    expect(result.current.map((item) => item.label)).toEqual(["Open Vault…", "Create Vault…"]);
  });
});
