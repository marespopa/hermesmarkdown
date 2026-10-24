import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_browserVaultDialogOpen, atom_newVaultFlowOpen, atom_pendingVaultIcon } from "@/app/atoms/ui-atoms";
import NewVaultDialog from "./NewVaultDialog";

const fs = vi.hoisted(() => ({ isVaultSupported: true, isBrowserVaultSupported: true, createBrowserVault: vi.fn() }));
const flow = vi.hoisted(() => ({ createVault: vi.fn(), resetFlow: vi.fn() }));
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => fs }));
vi.mock("@/app/hooks/file-system/use-create-vault", () => ({
  useCreateVault: () => ({
    subStep: "name-and-folder",
    vaultName: "Ideas",
    setVaultName: vi.fn(),
    parentHandle: null,
    parentFolderName: null,
    error: null,
    setError: vi.fn(),
    validateName: () => null,
    pickParentFolder: vi.fn(),
    createVault: flow.createVault,
    startCreationFlow: vi.fn(),
    goBack: vi.fn(),
    resetFlow: flow.resetFlow,
  }),
}));
vi.mock("./PinIconPopover", () => ({
  default: ({ onPick }: { onPick: (icon: string | null) => Promise<boolean> }) => (
    <button type="button" onClick={() => void onPick("📓")}>Pick emoji</button>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function setup() {
  const store = createStore();
  store.set(atom_newVaultFlowOpen, true);
  render(<Provider store={store}><NewVaultDialog /></Provider>);
  return store;
}

describe("NewVaultDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fs.isVaultSupported = true;
  });

  it("asks for a parent folder on disk, and only a name in the browser", async () => {
    fs.createBrowserVault.mockResolvedValue(true);
    setup();
    expect(screen.getByRole("button", { name: "Choose parent folder…" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "In this browser" }));
    expect(screen.queryByRole("button", { name: "Choose parent folder…" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create Vault" }));
    await waitFor(() => expect(fs.createBrowserVault).toHaveBeenCalledWith("Ideas"));
    expect(flow.createVault).not.toHaveBeenCalled();
  });

  it("goes straight to a browser vault where folders can't be opened", () => {
    fs.isVaultSupported = false;
    setup();
    expect(screen.queryByRole("tab", { name: "Folder on disk" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose parent folder…" })).not.toBeInTheDocument();
  });

  it("opens the browser vaults' manager", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("tab", { name: "In this browser" }));
    fireEvent.click(screen.getByRole("button", { name: "Manage browser vaults…" }));
    expect(store.get(atom_browserVaultDialogOpen)).toBe(true);
  });

  it("holds the icon picked beside the name for the new vault", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: "Add vault icon" }));
    fireEvent.click(screen.getByRole("button", { name: "Pick emoji" }));
    expect(screen.getByRole("button", { name: "Change vault icon" })).toHaveTextContent("📓");
    fireEvent.click(screen.getByRole("tab", { name: "In this browser" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Vault" }));
    expect(store.get(atom_pendingVaultIcon)).toEqual({ name: "Ideas", icon: "📓" });
  });
});
