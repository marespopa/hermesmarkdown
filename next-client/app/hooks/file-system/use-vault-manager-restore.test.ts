import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_isRequestingAccess, atom_isVaultPending, atom_isVaultRestoring, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { readVaultHint, writeVaultHint } from "@/app/services/vault-hint";
import { useVaultManager } from "./use-vault-manager";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const toasts = vi.hoisted(() => ({ showActionToast: vi.fn() }));
vi.mock("@/app/components/Toastr", () => ({ showActionToast: toasts.showActionToast }));
vi.mock("@/app/atoms/file-atoms", async (importOriginal) => ({ ...(await importOriginal<object>()), isOpenNotesHydrated: () => true }));
vi.mock("./shared", async (importOriginal) => ({ ...(await importOriginal<object>()), isIdbSupported: true }));

const saved = { kind: "directory", name: "notes" } as unknown as FileSystemDirectoryHandle;
const idb = vi.hoisted(() => ({
  loadVaultHandle: vi.fn(),
  askPermissionWithin: vi.fn(),
}));
vi.mock("@/app/services/idb", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  saveVaultHandle: vi.fn(async () => {}),
  clearVaultHandle: vi.fn(async () => {}),
  loadVaultHandle: idb.loadVaultHandle,
  askPermissionWithin: idb.askPermissionWithin,
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

  const ask = (result: "granted" | "denied" | "no-answer", pending: Promise<boolean> = Promise.resolve(result === "granted")) =>
    ({ result, pending });

  it("asks for access straight away, and keeps the skeleton (not the overlay) while the browser's prompt is open", async () => {
    let answer!: (ask: ReturnType<typeof ask>) => void;
    idb.askPermissionWithin.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
    const store = mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(idb.askPermissionWithin).toHaveBeenCalledWith(saved);
    expect(store.get(atom_isRequestingAccess)).toBe(true);
    expect(store.get(atom_isVaultRestoring)).toBe(true);
    expect(store.get(atom_isVaultPending)).toBe(false);

    await act(async () => { answer(ask("denied")); await vi.advanceTimersByTimeAsync(0); });
    expect(store.get(atom_isRequestingAccess)).toBe(false);
  });

  it("falls back to the access-paused overlay when the browser can't or won't ask", async () => {
    idb.askPermissionWithin.mockResolvedValue(ask("denied"));
    const store = mount();

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(store.get(atom_isVaultRestoring)).toBe(false);
    expect(store.get(atom_isVaultPending)).toBe(true);
    expect(store.get(atom_vaultHandle)).toBe(saved);
    expect(readVaultHint()).toBe("saved");
  });

  it("goes pending when the ask gets no answer, and a late grant unlocks the vault", async () => {
    let late!: (granted: boolean) => void;
    idb.askPermissionWithin.mockResolvedValue(ask("no-answer", new Promise<boolean>((resolve) => { late = resolve; })));
    const store = mount();

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(store.get(atom_isRequestingAccess)).toBe(false);
    expect(store.get(atom_isVaultRestoring)).toBe(false);
    expect(store.get(atom_isVaultPending)).toBe(true);

    await act(async () => { late(true); await vi.advanceTimersByTimeAsync(0); });
    expect(store.get(atom_isVaultPending)).toBe(false);
  });

  it("stays pending when the late answer is a denial", async () => {
    let late!: (granted: boolean) => void;
    idb.askPermissionWithin.mockResolvedValue(ask("no-answer", new Promise<boolean>((resolve) => { late = resolve; })));
    const store = mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    await act(async () => { late(false); await vi.advanceTimersByTimeAsync(0); });
    expect(store.get(atom_isVaultPending)).toBe(true);
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
