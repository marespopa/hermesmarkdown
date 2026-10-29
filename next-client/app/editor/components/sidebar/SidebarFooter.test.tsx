import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import SidebarFooter from "./SidebarFooter";

const git = vi.hoisted(() => ({ branch: null as string | null | undefined }));

vi.mock("../../hooks/use-vault-git-branch", () => ({ useVaultGitBranch: () => git.branch }));

const showCopyToast = vi.hoisted(() => vi.fn());
const showErrorToast = vi.hoisted(() => vi.fn());
vi.mock("@/app/components/Toastr", () => ({ showCopyToast, showErrorToast }));

const renderFooter = ({ diskVault = false } = {}) => {
  const store = createStore();
  if (diskVault) {
    store.set(atom_vaultDescriptor, { kind: "local" });
    store.set(atom_vaultHandle, {} as FileSystemDirectoryHandle);
  }
  render(
    <Provider store={store}>
      <SidebarFooter />
    </Provider>,
  );
  return store;
};

describe("SidebarFooter", () => {
  beforeEach(() => {
    git.branch = null;
  });
  afterEach(cleanup);

  it("does not render Settings or Help controls", () => {
    renderFooter();
    expect(screen.queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Help" })).not.toBeInTheDocument();
  });

  it("shows the named Git branch in a bottom status bar", () => {
    git.branch = "feature/footer";
    renderFooter({ diskVault: true });
    const branch = screen.getByRole("status", { name: "Git branch: feature/footer" });
    expect(branch).toHaveAttribute("title", "Git branch: feature/footer");
    expect(screen.queryByRole("button", { name: "Git branch: feature/footer" })).not.toBeInTheDocument();
  });

  it("copies the named Git branch from the status bar", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    git.branch = "feature/footer";
    renderFooter({ diskVault: true });
    fireEvent.click(screen.getByRole("button", { name: "Copy branch name" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("feature/footer"));
    expect(showCopyToast).toHaveBeenCalledWith("Branch name copied");
  });

  it("does not show a status bar for a disk vault without Git", () => {
    renderFooter({ diskVault: true });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
