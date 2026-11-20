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

const nameOf = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });
const item = (name: string) => screen.getByRole("menuitem", { name });

describe("RecentVaultsDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens the vault's menu on a right-click on its name, and pins from it", () => {
    setup([vault("Projects", true), vault("Archive")]);
    fireEvent.contextMenu(nameOf("Archive"));
    expect(recents.openRecentVault).not.toHaveBeenCalled();
    fireEvent.click(item("Pin"));
    expect(recents.pinRecentVault).toHaveBeenCalledWith("local:Archive", true);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the same menu on a right-click, and unpins from it", () => {
    setup([vault("Projects", true), vault("Archive")]);
    fireEvent.contextMenu(nameOf("Projects"));
    fireEvent.click(item("Unpin"));
    expect(recents.pinRecentVault).toHaveBeenCalledWith("local:Projects", false);
  });

  it("opens the vault on a left-click on its name", async () => {
    recents.openRecentVault.mockResolvedValue(true);
    setup([vault("Projects", true), vault("Archive")]);
    fireEvent.click(nameOf("Archive"));
    expect(recents.openRecentVault).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("has no separate pin or remove buttons on a row", () => {
    setup([vault("Archive")]);
    expect(screen.queryByRole("button", { name: /^(Pin|Unpin|Remove)/ })).not.toBeInTheDocument();
  });

  it("removes a vault from the list from its menu", () => {
    setup([vault("Archive")]);
    fireEvent.contextMenu(nameOf("Archive"));
    fireEvent.click(item("Remove from Recents"));
    expect(recents.forgetRecentVault).toHaveBeenCalledWith("local:Archive");
  });

  it("moves a vault with Alt+arrow keys", () => {
    setup([vault("Projects"), vault("Archive")]);
    fireEvent.keyDown(nameOf("Archive"), { key: "ArrowUp", altKey: true });
    expect(recents.moveRecentVault).toHaveBeenCalledWith("local:Archive", 0);
    fireEvent.keyDown(nameOf("Projects"), { key: "ArrowDown" });
    expect(recents.moveRecentVault).toHaveBeenCalledTimes(1);
  });

  it("opens a vault from its menu and closes, but not the open one", async () => {
    recents.openRecentVault.mockResolvedValue(true);
    const store = setup([vault("Projects"), vault("Archive")], "Projects");
    fireEvent.contextMenu(nameOf("Projects"));
    expect(item("Open Vault")).toBeDisabled();
    fireEvent.keyDown(item("Open Vault"), { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(store.get(atom_recentVaultsDialogOpen)).toBe(true);

    fireEvent.contextMenu(nameOf("Archive"));
    fireEvent.click(item("Open Vault"));
    expect(recents.openRecentVault).toHaveBeenCalledWith(recents.list[1]);
    await waitFor(() => expect(store.get(atom_recentVaultsDialogOpen)).toBe(false));
  });

  it("changes a recent vault's icon from its row", () => {
    setup([vault("Archive")]);
    fireEvent.click(screen.getByRole("button", { name: "Add icon to Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Pick emoji" }));
    expect(recents.setRecentVaultIcon).toHaveBeenCalledWith("local:Archive", "📚");
  });

  it("changes the icon from the vault's menu too", () => {
    setup([vault("Archive")]);
    fireEvent.contextMenu(nameOf("Archive"));
    fireEvent.click(item("Set Icon…"));
    fireEvent.click(screen.getByRole("button", { name: "Pick emoji" }));
    expect(recents.setRecentVaultIcon).toHaveBeenCalledWith("local:Archive", "📚");
  });
});
