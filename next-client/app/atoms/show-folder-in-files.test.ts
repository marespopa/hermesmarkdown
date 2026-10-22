import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import {
  atom_fileTreeExpansion,
  atom_filesFocusRequested,
  atom_filesRevealPath,
  atom_showFolderInFiles,
  atom_sidebarOpen,
  atom_vaultHandle,
} from "./atoms";

function storeWithVault() {
  const store = createStore();
  store.set(atom_vaultHandle, { name: "Notes" } as FileSystemDirectoryHandle);
  store.set(atom_sidebarOpen, false);
  return store;
}

describe("atom_showFolderInFiles", () => {
  it("opens the folder and every folder above it, keeping other overrides", () => {
    const store = storeWithVault();
    store.set(atom_fileTreeExpansion, {
      "local:Notes": { expanded: ["Archive"], collapsed: ["Projects", "Inbox"] },
    });
    store.set(atom_showFolderInFiles, "Projects/Launch/Assets");
    expect(store.get(atom_fileTreeExpansion)["local:Notes"]).toEqual({
      expanded: ["Archive", "Projects", "Projects/Launch", "Projects/Launch/Assets"],
      collapsed: ["Inbox"],
    });
  });

  it("shows the sidebar's Files and asks the tree to reveal the folder", () => {
    const store = storeWithVault();
    store.set(atom_showFolderInFiles, "Projects/Launch");
    expect(store.get(atom_sidebarOpen)).toBe(true);
    expect(store.get(atom_filesFocusRequested)).toBe(true);
    expect(store.get(atom_filesRevealPath)).toBe("Projects/Launch");
  });

  it("just shows Files for the vault's root", () => {
    const store = storeWithVault();
    store.set(atom_showFolderInFiles, "");
    expect(store.get(atom_filesFocusRequested)).toBe(true);
    expect(store.get(atom_filesRevealPath)).toBeNull();
  });
});
