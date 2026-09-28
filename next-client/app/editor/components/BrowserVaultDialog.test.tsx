import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BrowserVaultDialog from "./BrowserVaultDialog";
import { atom_browserVaultDialogOpen } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";

vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: vi.fn() }));
vi.mock("@/app/services/opfs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/services/opfs")>()),
  getStorageStatus: vi.fn(async () => ({ usage: 2048, quota: 1024 * 1024, persisted: false })),
  requestPersistentStorage: vi.fn(async () => true),
}));

const listBrowserVaults = vi.fn();
const createBrowserVault = vi.fn();
const openBrowserVault = vi.fn();
const deleteBrowserVault = vi.fn();

const notes = { version: 1, kind: "browser", id: "abc", displayName: "Notes", createdAt: Date.UTC(2026, 0, 5) };

function OpenState() {
  return <span data-testid="open">{String(useAtomValue(atom_browserVaultDialogOpen))}</span>;
}

function HydratedProvider({ children }: { children: React.ReactNode }) {
  useHydrateAtoms([[atom_browserVaultDialogOpen, true]]);
  return <>{children}</>;
}

function renderDialog() {
  return render(
    <Provider>
      <HydratedProvider>
        <BrowserVaultDialog />
        <OpenState />
      </HydratedProvider>
    </Provider>,
  );
}

describe("BrowserVaultDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listBrowserVaults.mockResolvedValue([notes]);
    (useFileSystem as ReturnType<typeof vi.fn>).mockReturnValue({
      listBrowserVaults,
      createBrowserVault,
      openBrowserVault,
      deleteBrowserVault,
    });
  });

  it("lists stored vaults with their backup state and storage usage", async () => {
    renderDialog();

    expect(await screen.findByText("Notes")).toBeInTheDocument();
    expect(screen.getByText(/Never backed up/)).toBeInTheDocument();
    expect(screen.getByText(/Using 2\.0 KB of 1\.0 MB/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep data" })).toBeInTheDocument();
  });

  it("creates a vault from the typed name and closes", async () => {
    createBrowserVault.mockResolvedValue(true);
    renderDialog();
    await screen.findByText("Notes");

    fireEvent.change(screen.getByPlaceholderText("My notes"), { target: { value: "Journal" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createBrowserVault).toHaveBeenCalledWith("Journal"));
    await waitFor(() => expect(screen.getByTestId("open")).toHaveTextContent("false"));
  });

  it("opens an existing vault", async () => {
    openBrowserVault.mockResolvedValue(true);
    renderDialog();

    fireEvent.click(await screen.findByText("Notes"));

    await waitFor(() => expect(openBrowserVault).toHaveBeenCalledWith(notes));
  });

  it("asks for confirmation before deleting", async () => {
    deleteBrowserVault.mockResolvedValue(true);
    renderDialog();
    await screen.findByText("Notes");

    fireEvent.click(screen.getByRole("button", { name: "Delete Notes" }));
    expect(deleteBrowserVault).not.toHaveBeenCalled();
    expect(screen.getByText(/Delete “Notes” and all its notes\?/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteBrowserVault).toHaveBeenCalledWith(notes));
    expect(listBrowserVaults).toHaveBeenCalledTimes(2);
  });
});
