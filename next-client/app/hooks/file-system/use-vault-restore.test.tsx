import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_hasLoadedVault, atom_isVaultPending, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useVaultManager } from "./use-vault-manager";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
vi.mock("@/app/components/Toastr", () => ({ showActionToast: vi.fn() }));
vi.mock("@/app/atoms/file-atoms", async (importOriginal) => ({ ...(await importOriginal<object>()), isOpenNotesHydrated: () => true }));
vi.mock("./shared", async (importOriginal) => ({ ...(await importOriginal<object>()), isIdbSupported: true }));
vi.mock("@/app/services/idb", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  saveVaultHandle: vi.fn(async () => {}),
  clearVaultHandle: vi.fn(async () => {}),
  loadVaultHandle: vi.fn(async () => null),
}));

// A handle whose permission request never settles, like Android Chrome with no prompt on screen.
function hungHandle() {
  return {
    kind: "directory",
    name: "notes",
    queryPermission: vi.fn(async () => "prompt"),
    requestPermission: vi.fn(() => new Promise<PermissionState>(() => {})),
  };
}

function mount(handle: unknown) {
  const store = createStore();
  store.set(atom_hasLoadedVault, true); // the startup restore is not under test here
  store.set(atom_vaultHandle, handle as FileSystemDirectoryHandle);
  store.set(atom_isVaultPending, true);
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const { result } = renderHook(() => useVaultManager(), { wrapper });
  return { store, result };
}

describe("useVaultManager, restoreVault from the overlay's tap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("ignores a second tap while the first is still waiting", async () => {
    const handle = hungHandle();
    const { result } = mount(handle);

    await act(async () => { void result.current.restoreVault(); void result.current.restoreVault(); });

    expect(handle.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("asks again on the next tap when the first got no answer", async () => {
    const handle = hungHandle();
    const { result } = mount(handle);

    await act(async () => { void result.current.restoreVault(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(4100); });
    await act(async () => { void result.current.restoreVault(); });

    expect(handle.requestPermission).toHaveBeenCalledTimes(2);
  });

  it("unlocks once when an earlier ask is granted late", async () => {
    const handle = hungHandle();
    let grantFirst!: (state: PermissionState) => void;
    handle.requestPermission
      .mockImplementationOnce(() => new Promise<PermissionState>((resolve) => { grantFirst = resolve; }))
      .mockImplementationOnce(() => Promise.resolve("granted" as PermissionState));
    const { store, result } = mount(handle);

    await act(async () => { void result.current.restoreVault(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(4100); });
    await act(async () => { void result.current.restoreVault(); await vi.advanceTimersByTimeAsync(0); });
    expect(store.get(atom_isVaultPending)).toBe(false);

    // The first ask answers after the vault is already open: nothing runs again.
    await act(async () => { grantFirst("granted"); await vi.advanceTimersByTimeAsync(0); });
    expect(store.get(atom_isVaultPending)).toBe(false);
  });
});
