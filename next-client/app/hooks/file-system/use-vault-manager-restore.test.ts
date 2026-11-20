import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_isVaultPending, atom_isVaultRestoring, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { readVaultHint, writeVaultHint } from "@/app/services/vault-hint";
import { useVaultManager } from "./use-vault-manager";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const toasts = vi.hoisted(() => ({ showActionToast: vi.fn() }));
vi.mock("@/app/components/Toastr", () => ({ showActionToast: toasts.showActionToast }));
vi.mock("./shared", async (importOriginal) => ({ ...(await importOriginal<object>()), isIdbSupported: true }));

const saved = { kind: "directory", name: "notes" } as unknown as FileSystemDirectoryHandle;
const idb = vi.hoisted(() => ({
  loadVaultHandle: vi.fn(),
  queryPermission: vi.fn(),
}));
vi.mock("@/app/services/idb", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  saveVaultHandle: vi.fn(async () => {}),
  clearVaultHandle: vi.fn(async () => {}),
  loadVaultHandle: idb.loadVaultHandle,
  queryPermission: idb.queryPermission,
}));

function mount() {
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  renderHook(() => useVaultManager(), { wrapper });
  return store;
}

describe("useVaultManager, restoring the saved vault on load", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    writeVaultHint("saved");
    idb.loadVaultHandle.mockResolvedValue(saved);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("asks for access again when the permission check never answers, instead of staying on the skeleton", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    idb.queryPermission.mockReturnValue(new Promise(() => {}));
    const store = mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(store.get(atom_isVaultRestoring)).toBe(true);

    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });

    expect(store.get(atom_isVaultRestoring)).toBe(false);
    expect(store.get(atom_isVaultPending)).toBe(true);
    expect(store.get(atom_vaultHandle)).toBe(saved);
    expect(readVaultHint()).toBe("saved");
  });

  it("keeps the saved-vault hint when the saved vault can't be read in time", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const timeout = Object.assign(new Error("Vault database timed out after 4000ms"), { name: "TimeoutError" });
    idb.loadVaultHandle.mockRejectedValue(timeout);
    const store = mount();

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(store.get(atom_isVaultRestoring)).toBe(false);
    expect(readVaultHint()).toBe("saved");
    expect(toasts.showActionToast).toHaveBeenCalledWith("Couldn't open your vault.", "Reload", expect.any(Function));
  });
});
