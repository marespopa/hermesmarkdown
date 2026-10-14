import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_resumeRequested } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useChooseFolder } from "./use-choose-folder";

vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: vi.fn() }));

function setup(opened: boolean, isVaultSupported = true) {
  const openVault = vi.fn().mockResolvedValue(opened);
  (useFileSystem as any).mockReturnValue({ openVault, isVaultSupported });
  const materializeDraft = vi.fn().mockResolvedValue("Trip ideas.md");
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useChooseFolder(materializeDraft), { wrapper });
  return { store, openVault, materializeDraft, choose: result.current };
}

describe("useChooseFolder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves the draft into the chosen folder and keeps it in front", async () => {
    const { store, openVault, materializeDraft, choose } = setup(true);
    await act(() => choose());
    expect(openVault).toHaveBeenCalledTimes(1);
    expect(materializeDraft).toHaveBeenCalledTimes(1);
    // Left for the vault-open behavior to consume, so the feed stays closed.
    expect(store.get(atom_resumeRequested)).toBe(true);
  });

  it("changes nothing when the picker is cancelled", async () => {
    const { store, materializeDraft, choose } = setup(false);
    await act(() => choose());
    expect(materializeDraft).not.toHaveBeenCalled();
    expect(store.get(atom_resumeRequested)).toBe(false);
  });

  it("keeps the draft in front for the browser vault made from the dialog", async () => {
    const { store, materializeDraft, choose } = setup(false, false);
    await act(() => choose());
    expect(materializeDraft).not.toHaveBeenCalled();
    expect(store.get(atom_resumeRequested)).toBe(true);
  });
});
