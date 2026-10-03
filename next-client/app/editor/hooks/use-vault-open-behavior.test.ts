import React from "react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_homeFeedOpen, atom_onVaultOpen } from "@/app/atoms/ui-atoms";
import { useVaultOpenBehavior } from "./use-vault-open-behavior";

// A fresh store stands in for a page load; sessionStorage is what survives a
// refresh of the same tab.
function openVault() {
  const store = createStore();
  store.set(atom_onVaultOpen, "home");
  store.set(atom_vaultHandle, { name: "Notes" } as FileSystemDirectoryHandle);
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  renderHook(() => useVaultOpenBehavior(), { wrapper });
  return store;
}

describe("useVaultOpenBehavior", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("opens the home feed the first time a vault opens in this tab", () => {
    expect(openVault().get(atom_homeFeedOpen)).toBe(true);
  });

  it("stays on the note after a refresh of the same tab", () => {
    openVault();
    expect(openVault().get(atom_homeFeedOpen)).toBe(false);
  });
});
