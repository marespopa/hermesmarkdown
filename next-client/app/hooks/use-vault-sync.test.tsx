import React from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_currentDirectoryHandle, atom_vaultHandle } from "@/app/atoms/atoms";
import { useVaultSync, VAULT_WATCH_DEBOUNCE } from "./use-vault-sync";

vi.mock("react-hot-toast", () => ({ default: { loading: vi.fn(), success: vi.fn(), error: vi.fn(), dismiss: vi.fn() } }));
const fileSystem = vi.hoisted(() => ({ scanVault: vi.fn(async () => {}), indexVaultTags: vi.fn(async () => {}) }));
vi.mock("./use-file-system", () => ({ useFileSystem: () => fileSystem }));
const watcher = vi.hoisted(() => ({ onChange: null as null | (() => void), stop: vi.fn() }));
vi.mock("./file-system/file-observer", () => ({
  observeVault: vi.fn(async (_root: unknown, onChange: () => void, _onError?: () => void) => {
    watcher.onChange = onChange;
    return watcher.stop;
  }),
}));

const health = vi.hoisted(() => ({ checkVaultHealth: vi.fn(async (_vault: unknown) => "ok") }));
vi.mock("./file-system/vault-health", () => health);

const vault = { kind: "directory", name: "vault" } as unknown as FileSystemDirectoryHandle;
const subfolder = { kind: "directory", name: "notes" } as unknown as FileSystemDirectoryHandle;

function setup() {
  const store = createStore();
  store.set(atom_vaultHandle, vault);
  store.set(atom_currentDirectoryHandle, subfolder);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => useVaultSync(), { wrapper });
}

describe("useVaultSync folder watching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    watcher.onChange = null;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("rescans the whole vault once after a burst of file-list changes", async () => {
    const { unmount } = setup();
    await act(async () => { await Promise.resolve(); });
    expect(watcher.onChange).not.toBeNull();

    act(() => {
      watcher.onChange!();
      watcher.onChange!();
      watcher.onChange!();
    });
    expect(fileSystem.scanVault).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(VAULT_WATCH_DEBOUNCE); });
    expect(fileSystem.scanVault).toHaveBeenCalledTimes(1);
    expect(fileSystem.scanVault).toHaveBeenCalledWith(vault);
    expect(fileSystem.indexVaultTags).toHaveBeenCalledTimes(1);

    unmount();
    expect(watcher.stop).toHaveBeenCalled();
  });

  it("still rescans the current folder when the window regains focus", async () => {
    setup();
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fileSystem.scanVault).toHaveBeenCalledWith(subfolder);
  });

  it("checks the vault folder first and doesn't rescan one that went missing", async () => {
    health.checkVaultHealth.mockResolvedValueOnce("vault-missing");
    setup();
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(health.checkVaultHealth).toHaveBeenCalledWith(vault);
    expect(fileSystem.scanVault).not.toHaveBeenCalled();
  });

  it("resyncs when the browser drops the folder observation", async () => {
    const { observeVault } = await import("./file-system/file-observer");
    setup();
    await act(async () => { await Promise.resolve(); });
    const onError = vi.mocked(observeVault).mock.calls[0][2];
    act(() => onError?.());
    await act(async () => { await vi.advanceTimersByTimeAsync(VAULT_WATCH_DEBOUNCE); });
    expect(health.checkVaultHealth).toHaveBeenCalled();
  });
});
