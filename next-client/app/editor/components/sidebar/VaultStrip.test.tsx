import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import type { RecentVault } from "@/app/services/recent-vaults";
import VaultStrip from "./VaultStrip";

const vault = (name: string, extra: Partial<RecentVault> = {}): RecentVault =>
  ({ key: `local:${name}`, kind: "local", name, handle: { name } as FileSystemDirectoryHandle, openedAt: 0, ...extra }) as RecentVault;

const recents = vi.hoisted(() => ({
  allRecentVaults: [] as RecentVault[],
  openRecentVault: vi.fn(),
  pinRecentVault: vi.fn(),
  forgetRecentVault: vi.fn(),
  setRecentVaultIcon: vi.fn(),
}));
vi.mock("../../hooks/use-recent-vaults", () => ({ useRecentVaults: () => recents }));
const fileSystem = vi.hoisted(() => ({ openVault: vi.fn() }));
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ openVault: fileSystem.openVault, isVaultSupported: true, isBrowserVaultSupported: true }),
}));
vi.mock("../PinIconPopover", () => ({ default: () => <div role="dialog" aria-label="Vault icon" /> }));

function setup(list: RecentVault[], openName = "Notes") {
  recents.allRecentVaults = list;
  const store = createStore();
  store.set(atom_vaultHandle, { name: openName } as FileSystemDirectoryHandle);
  store.set(atom_vaultDescriptor, { kind: "local" });
  render(<Provider store={store}><VaultStrip /></Provider>);
  return store;
}

describe("VaultStrip", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the pinned vaults and the open one, not other recents", () => {
    setup([vault("Notes"), vault("Work", { pinned: true }), vault("Old")]);
    expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Work" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("button", { name: "Old" })).not.toBeInTheDocument();
  });

  it("switches on a left-click, marking it current at once", async () => {
    let finish: (opened: boolean) => void = () => {};
    recents.openRecentVault.mockReturnValue(new Promise<boolean>((resolve) => { finish = resolve; }));
    setup([vault("Notes"), vault("Work", { pinned: true })]);
    fireEvent.click(screen.getByRole("button", { name: "Work" }));
    expect(recents.openRecentVault).toHaveBeenCalledWith(expect.objectContaining({ key: "local:Work" }));
    expect(screen.getByRole("button", { name: "Work" })).toHaveAttribute("aria-current", "true");
    finish(false);
    await waitFor(() => expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute("aria-current", "true"));
  });

  it("does not reopen the open vault", () => {
    setup([vault("Notes")]);
    fireEvent.click(screen.getByRole("button", { name: "Notes" }));
    expect(recents.openRecentVault).not.toHaveBeenCalled();
  });

  it("opens a menu on a right-click, and unpins from it", () => {
    setup([vault("Notes"), vault("Work", { pinned: true })]);
    fireEvent.contextMenu(screen.getByRole("button", { name: "Work" }));
    expect(recents.openRecentVault).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Unpin" }));
    expect(recents.pinRecentVault).toHaveBeenCalledWith("local:Work", false);
  });

  it("opens a vault from the + menu", () => {
    setup([vault("Notes")]);
    fireEvent.click(screen.getByRole("button", { name: "Add vault" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open Vault…" }));
    expect(fileSystem.openVault).toHaveBeenCalled();
  });
});
