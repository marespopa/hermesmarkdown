import React from "react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";

// Fresh modules and a fresh store stand in for a page load (stored atoms read
// sessionStorage when their module loads); sessionStorage is what survives a
// refresh of the same tab.
async function openVault() {
  vi.resetModules();
  const { atom_vaultHandle } = await import("@/app/atoms/vault-atoms");
  const { atom_homeFeedOpen, atom_onVaultOpen } = await import("@/app/atoms/ui-atoms");
  const { useVaultOpenBehavior } = await import("./use-vault-open-behavior");
  const store = createStore();
  store.set(atom_onVaultOpen, "home");
  store.set(atom_vaultHandle, { name: "Notes" } as FileSystemDirectoryHandle);
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  renderHook(() => useVaultOpenBehavior(), { wrapper });
  return store.get(atom_homeFeedOpen);
}

// A page load with no vault: `restoring` is whether the saved vault is still
// being looked up.
async function loadWithoutVault(restoring = false) {
  vi.resetModules();
  const { atom_isVaultRestoring } = await import("@/app/atoms/vault-atoms");
  const { atom_homeFeedOpen } = await import("@/app/atoms/ui-atoms");
  const { useVaultOpenBehavior } = await import("./use-vault-open-behavior");
  const store = createStore();
  store.set(atom_isVaultRestoring, restoring);
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  renderHook(() => useVaultOpenBehavior(), { wrapper });
  return store.get(atom_homeFeedOpen);
}

describe("useVaultOpenBehavior", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("opens the home feed the first time a vault opens in this tab", async () => {
    expect(await openVault()).toBe(true);
  });

  it("stays on the note after a refresh of the same tab", async () => {
    await openVault();
    expect(await openVault()).toBe(false);
  });

  it("opens the home feed with no vault, once the saved vault had its chance", async () => {
    expect(await loadWithoutVault(true)).toBe(false);
    expect(await loadWithoutVault()).toBe(true);
  });

  it("stays on the draft after a refresh with no vault", async () => {
    await loadWithoutVault();
    expect(await loadWithoutVault()).toBe(false);
  });

  it("still applies the setting when a vault opens after the no-vault feed", async () => {
    await loadWithoutVault();
    expect(await openVault()).toBe(true);
  });
});
