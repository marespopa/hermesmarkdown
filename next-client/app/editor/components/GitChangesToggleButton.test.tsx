import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it } from "vitest";
import { atom_gitLoading, atom_showGitChanges } from "@/app/atoms/git-atoms";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import GitChangesToggleButton from "./GitChangesToggleButton";

// A store whose open vault is a disk vault, with or without a `.git` folder.
async function vaultStore(withGit = true) {
  const store = createStore();
  const vault = new MemoryDirectoryHandle("vault");
  if (withGit) await vault.getDirectoryHandle(".git", { create: true });
  store.set(atom_vaultHandle, vault as unknown as FileSystemDirectoryHandle);
  store.set(atom_vaultDescriptor, { kind: "local" });
  return store;
}

describe("GitChangesToggleButton", () => {
  it("isn't shown when the vault has no .git folder", async () => {
    const store = await vaultStore(false);
    render(<Provider store={store}><GitChangesToggleButton /></Provider>);
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "Git Changes" })).toBeNull();
  });

  it("shows and hides the git changes diff, pressed while it's on", async () => {
    const store = await vaultStore();
    store.set(atom_showGitChanges, false);
    render(<Provider store={store}><GitChangesToggleButton /></Provider>);
    const button = await screen.findByRole("button", { name: "Git Changes" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    expect(store.get(atom_showGitChanges)).toBe(true);
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);
    expect(store.get(atom_showGitChanges)).toBe(false);
  });

  it("is busy while HEAD's text is being read, only when Git Changes is on", async () => {
    const store = await vaultStore();
    store.set(atom_showGitChanges, true);
    store.set(atom_gitLoading, 1);
    render(<Provider store={store}><GitChangesToggleButton /></Provider>);
    const button = await screen.findByRole("button", { name: "Git Changes" });
    expect(button).toHaveAttribute("aria-busy", "true");

    act(() => store.set(atom_gitLoading, 0));
    expect(button).not.toHaveAttribute("aria-busy");

    act(() => {
      store.set(atom_gitLoading, 1);
      store.set(atom_showGitChanges, false);
    });
    expect(button).not.toHaveAttribute("aria-busy");
  });
});
