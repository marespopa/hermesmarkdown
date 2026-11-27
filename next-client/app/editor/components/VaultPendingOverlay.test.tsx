import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RecentVault } from "@/app/services/recent-vaults";
import VaultPendingOverlay from "./VaultPendingOverlay";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const recent = (key: string, name: string): RecentVault =>
  ({ key, name, kind: "local", handle: {} as FileSystemDirectoryHandle }) as RecentVault;

describe("VaultPendingOverlay", () => {
  it("restores access from its main button", () => {
    const restoreVault = vi.fn();
    render(<VaultPendingOverlay restoreVault={restoreVault} vaultName="notes" />);
    expect(screen.getByText("“notes”")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restore Access" }));
    expect(restoreVault).toHaveBeenCalledTimes(1);
  });

  it("says when access wasn't allowed and offers to try again", () => {
    render(<VaultPendingOverlay restoreVault={vi.fn()} denied />);
    expect(screen.getByRole("status")).toHaveTextContent("Access wasn't allowed");
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
  });

  it("opens another recent vault or a picked folder instead", () => {
    const onOpenRecent = vi.fn();
    const onOpenFolder = vi.fn();
    const vaults = [recent("a", "Work"), recent("b", "Journal"), recent("c", "Recipes"), recent("d", "Archive")];
    render(<VaultPendingOverlay restoreVault={vi.fn()} otherVaults={vaults} onOpenRecent={onOpenRecent} onOpenFolder={onOpenFolder} />);

    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Journal" }));
    expect(onOpenRecent).toHaveBeenCalledWith(vaults[1]);
    fireEvent.click(screen.getByRole("button", { name: "Open Folder…" }));
    expect(onOpenFolder).toHaveBeenCalledTimes(1);
  });
});
