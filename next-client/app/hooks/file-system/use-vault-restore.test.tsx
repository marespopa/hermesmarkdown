import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_hasLoadedVault, atom_isVaultPending, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useVaultManager } from "./use-vault-manager";
import { loadVaultHandle } from "@/app/services/idb";
import { CompositeDirectoryHandle } from "@/app/services/library-roots";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const toastr = vi.hoisted(() => ({ showActionToast: vi.fn() }));
vi.mock("@/app/components/Toastr", () => toastr);
const library = vi.hoisted(() => ({
  loadLibraryMounts: vi.fn(async (): Promise<{ name: string; handle: FileSystemDirectoryHandle }[]> => []),
  buildLibraryHandle: vi.fn(async (_key: string, primary: FileSystemDirectoryHandle) => primary),
}));
vi.mock("@/app/services/library-store", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadLibraryMounts: library.loadLibraryMounts,
  buildLibraryHandle: library.buildLibraryHandle,
}));
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

// A folder whose access lapsed: no prompt opens without a click, and one
// that does (after a tap) answers `answer`.
function lapsedHandle(name: string, answer: PermissionState = "granted") {
  let tapped = false;
  return {
    kind: "directory",
    name,
    tap: () => { tapped = true; },
    isSameEntry: vi.fn(async () => false),
    queryPermission: vi.fn(async () => "prompt" as PermissionState),
    requestPermission: vi.fn(async () => {
      if (!tapped) throw new DOMException("Needs a user gesture", "SecurityError");
      return answer;
    }),
  };
}

// The startup restore runs: the saved vault has lapsed, so it goes pending.
async function mountPaused(vault: ReturnType<typeof lapsedHandle>) {
  vi.mocked(loadVaultHandle).mockResolvedValueOnce(vault as unknown as FileSystemDirectoryHandle);
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const { result } = renderHook(() => useVaultManager(), { wrapper });
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(store.get(atom_isVaultPending)).toBe(true);
  return { store, result };
}

describe("useVaultManager, a paused vault with added folders", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("asks for the vault, then each added folder, in the same tap", async () => {
    const vault = lapsedHandle("notes");
    const folder = lapsedHandle("extra");
    library.loadLibraryMounts.mockResolvedValueOnce([{ name: "extra", handle: folder as unknown as FileSystemDirectoryHandle }]);
    const { store, result } = await mountPaused(vault);

    vault.tap();
    folder.tap();
    await act(async () => { void result.current.restoreVault(); await vi.advanceTimersByTimeAsync(0); });

    expect(folder.requestPermission).toHaveBeenCalledWith({ mode: "readwrite" });
    expect(vault.requestPermission.mock.invocationCallOrder.at(-1)!)
      .toBeLessThan(folder.requestPermission.mock.invocationCallOrder.at(-1)!);
    expect(store.get(atom_isVaultPending)).toBe(false);
  });

  it("offers each folder still locked once the vault is readable", async () => {
    const vault = lapsedHandle("notes");
    const folder = lapsedHandle("extra");
    library.buildLibraryHandle.mockImplementationOnce(async (_key, primary) =>
      new CompositeDirectoryHandle(primary, [{ name: "extra", handle: folder as unknown as FileSystemDirectoryHandle, locked: true }]) as unknown as FileSystemDirectoryHandle);
    const { result } = await mountPaused(vault);

    vault.tap();
    await act(async () => { void result.current.restoreVault(); await vi.advanceTimersByTimeAsync(0); });

    expect(toastr.showActionToast).toHaveBeenCalledWith("“extra” needs access again.", "Allow", expect.any(Function));
  });

  it("reports a refused ask so the screen can say so", async () => {
    const vault = lapsedHandle("notes", "denied");
    const { store, result } = await mountPaused(vault);

    vault.tap();
    let outcome: string | undefined;
    await act(async () => { outcome = await result.current.restoreVault(); });

    expect(outcome).toBe("denied");
    expect(store.get(atom_isVaultPending)).toBe(true);
  });
});
