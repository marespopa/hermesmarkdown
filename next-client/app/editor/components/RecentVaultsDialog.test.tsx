import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_recentVaultsDialogOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import type { RecentVault } from "@/app/services/recent-vaults";
import RecentVaultsDialog from "./RecentVaultsDialog";

const recents = vi.hoisted(() => ({
  list: [] as RecentVault[],
  openRecentVault: vi.fn(),
  forgetRecentVault: vi.fn(),
  pinRecentVault: vi.fn(),
  moveRecentVault: vi.fn(),
  setRecentVaultIcon: vi.fn(),
}));
vi.mock("../hooks/use-recent-vaults", () => ({
  useRecentVaults: () => ({ ...recents, allRecentVaults: recents.list, recentVaults: recents.list }),
}));
vi.mock("./PinIconPopover", () => ({
  default: ({ onPick }: { onPick: (icon: string | null) => Promise<boolean> }) => (
    <button type="button" onClick={() => void onPick("📚")}>Pick emoji</button>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const vault = (name: string, pinned?: boolean): RecentVault => ({
  key: `local:${name}`,
  kind: "local",
  name,
  handle: { name } as FileSystemDirectoryHandle,
  openedAt: 0,
  ...(pinned ? { pinned } : {}),
});

function setup(list: RecentVault[], openFolder?: string) {
  recents.list = list;
  const store = createStore();
  store.set(atom_recentVaultsDialogOpen, true);
  if (openFolder) store.set(atom_vaultHandle, { name: openFolder } as FileSystemDirectoryHandle);
  render(<Provider store={store}><RecentVaultsDialog /></Provider>);
  return store;
}

describe("RecentVaultsDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pins and unpins a vault", () => {
    setup([vault("Projects", true), vault("Archive")]);
    fireEvent.click(screen.getByRole("button", { name: "Pin Archive" }));
    expect(recents.pinRecentVault).toHaveBeenCalledWith("local:Archive", true);
    fireEvent.click(screen.getByRole("button", { name: "Unpin Projects" }));
    expect(recents.pinRecentVault).toHaveBeenCalledWith("local:Projects", false);
  });

  it("removes a vault from the list", () => {
    setup([vault("Archive")]);
    fireEvent.click(screen.getByRole("button", { name: "Remove Archive from recents" }));
    expect(recents.forgetRecentVault).toHaveBeenCalledWith("local:Archive");
  });

  it("moves a vault with Alt+arrow keys", () => {
    setup([vault("Projects"), vault("Archive")]);
    fireEvent.keyDown(screen.getByRole("button", { name: "Pin Archive" }), { key: "ArrowUp", altKey: true });
    expect(recents.moveRecentVault).toHaveBeenCalledWith("local:Archive", 0);
    fireEvent.keyDown(screen.getByRole("button", { name: "Pin Projects" }), { key: "ArrowDown" });
    expect(recents.moveRecentVault).toHaveBeenCalledTimes(1);
  });

  it("opens a vault and closes, but not the open one", async () => {
    recents.openRecentVault.mockResolvedValue(true);
    const store = setup([vault("Projects"), vault("Archive")], "Projects");
    expect(screen.getByRole("button", { name: /^Projects/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /^Archive/ }));
    expect(recents.openRecentVault).toHaveBeenCalledWith(recents.list[1]);
    await waitFor(() => expect(store.get(atom_recentVaultsDialogOpen)).toBe(false));
  });

  it("changes a recent vault's icon from its row", () => {
    setup([vault("Archive")]);
    fireEvent.click(screen.getByRole("button", { name: "Add icon to Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Pick emoji" }));
    expect(recents.setRecentVaultIcon).toHaveBeenCalledWith("local:Archive", "📚");
  });
});
