import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecentVault } from "@/app/services/recent-vaults";
import SidebarHeader from "./SidebarHeader";

const recents = vi.hoisted(() => ({ openVaultEntry: null as RecentVault | null, setRecentVaultIcon: vi.fn() }));
vi.mock("../../hooks/use-recent-vaults", () => ({ useRecentVaults: () => recents }));
vi.mock("../../hooks/use-vault-menu-items", () => ({ useVaultMenuItems: () => [] }));
vi.mock("../PinIconPopover", () => ({
  default: ({ onPick, label }: { onPick: (icon: string | null) => Promise<boolean>; label: string }) => (
    <div role="dialog" aria-label={label}>
      <button type="button" onClick={() => void onPick("📚")}>Pick emoji</button>
    </div>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const ENTRY: RecentVault = { key: "local:notes", kind: "local", name: "notes", handle: { name: "notes" } as FileSystemDirectoryHandle, openedAt: 0 };

function setup() {
  render(<Provider store={createStore()}><SidebarHeader onNewNote={vi.fn()} onHide={vi.fn()} /></Provider>);
}

describe("SidebarHeader", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets the open vault's icon from the picker in one click", () => {
    recents.openVaultEntry = ENTRY;
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Add vault icon" }));
    fireEvent.click(screen.getByRole("button", { name: "Pick emoji" }));
    expect(recents.setRecentVaultIcon).toHaveBeenCalledWith("local:notes", "📚");
  });

  it("shows the vault's emoji", () => {
    recents.openVaultEntry = { ...ENTRY, icon: "🧪" };
    setup();
    expect(screen.getByRole("button", { name: "Change vault icon" })).toHaveTextContent("🧪");
  });

  it("has no icon button without an open vault", () => {
    recents.openVaultEntry = null;
    setup();
    expect(screen.queryByRole("button", { name: /vault icon/ })).not.toBeInTheDocument();
  });
});
