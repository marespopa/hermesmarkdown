import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_openFiles, EMPTY_DRAFT } from "@/app/atoms/atoms";
import { atom_resumeRequested } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useChooseFolder } from "./use-choose-folder";

vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: vi.fn() }));

// `opened`: whether openVault opens one. Opening a vault clears every open
// tab, the draft included, the way initVaultFromHandle does.
function setup(opened: boolean, isVaultSupported = true) {
  const store = createStore();
  store.set(atom_openFiles, { draft: { ...EMPTY_DRAFT, content: "Trip ideas\n\nPack light." } });
  const openVault = vi.fn(async () => {
    if (!opened) return false;
    store.set(atom_openFiles, {});
    store.set(atom_vaultHandle, { name: "Notes" } as FileSystemDirectoryHandle);
    return true;
  });
  (useFileSystem as any).mockReturnValue({ openVault, isVaultSupported });
  let draftAtSave: string | undefined;
  const materializeDraft = vi.fn(async () => {
    draftAtSave = store.get(atom_openFiles).draft?.content;
    return "Trip ideas.md";
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useChooseFolder(materializeDraft), { wrapper });
  return { store, openVault, materializeDraft, choose: () => result.current(), draftAtSave: () => draftAtSave };
}

describe("useChooseFolder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("brings the draft back after the vault opens, saves it, and keeps it in front", async () => {
    const { store, openVault, materializeDraft, choose, draftAtSave } = setup(true);
    await act(() => choose());
    expect(openVault).toHaveBeenCalledTimes(1);
    expect(materializeDraft).toHaveBeenCalledTimes(1);
    expect(draftAtSave()).toBe("Trip ideas\n\nPack light.");
    // Left for the vault-open behavior to consume, so the feed stays closed.
    expect(store.get(atom_resumeRequested)).toBe(true);
  });

  it("changes nothing when the picker is cancelled", async () => {
    const { store, materializeDraft, choose } = setup(false);
    await act(() => choose());
    expect(materializeDraft).not.toHaveBeenCalled();
    expect(store.get(atom_resumeRequested)).toBe(false);
    expect(store.get(atom_openFiles).draft?.content).toBe("Trip ideas\n\nPack light.");
  });

  it("waits for the browser vault made from the dialog, then saves the draft into it", async () => {
    const { store, materializeDraft, choose, draftAtSave } = setup(false, false);
    await act(() => choose());
    expect(materializeDraft).not.toHaveBeenCalled();
    expect(store.get(atom_resumeRequested)).toBe(true);

    act(() => {
      store.set(atom_openFiles, {});
      store.set(atom_vaultHandle, { name: "Browser notes" } as FileSystemDirectoryHandle);
    });
    expect(materializeDraft).toHaveBeenCalledTimes(1);
    expect(draftAtSave()).toBe("Trip ideas\n\nPack light.");
  });
});
