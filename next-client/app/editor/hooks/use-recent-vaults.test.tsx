import React from "react";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_recentVaults, atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import type { RecentVault } from "@/app/services/recent-vaults";
import { recentVaultEntry, useRecentVaults, useRecentVaultTracker } from "./use-recent-vaults";

const fs = vi.hoisted(() => ({ initVaultFromHandle: vi.fn(), openBrowserVault: vi.fn() }));
const services = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  loadBrowserVaultRegistry: vi.fn(),
  listBrowserVaultIds: vi.fn(),
  getGitHubVaultWorkspace: vi.fn(),
  loadRecentVaults: vi.fn(),
  saveRecentVaults: vi.fn(),
}));
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ ...fs, isVaultSupported: true }),
}));
vi.mock("@/app/services/idb", () => ({
  verifyPermission: services.verifyPermission,
  loadBrowserVaultRegistry: services.loadBrowserVaultRegistry,
}));
vi.mock("@/app/services/opfs", () => ({ listBrowserVaultIds: services.listBrowserVaultIds }));
vi.mock("@/app/services/github-vault-workspace", () => ({ getGitHubVaultWorkspace: services.getGitHubVaultWorkspace }));
vi.mock("@/app/services/recent-vaults", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/services/recent-vaults")>()),
  loadRecentVaults: services.loadRecentVaults,
  saveRecentVaults: services.saveRecentVaults,
}));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const folder = { name: "journal" } as FileSystemDirectoryHandle;
const browserDescriptor = { version: 1, kind: "browser", id: "abc", displayName: "Ideas", createdAt: 0 } as any;
const LOCAL: RecentVault = { key: "local:journal", kind: "local", name: "journal", handle: folder, openedAt: 1 };
const BROWSER: RecentVault = { key: "browser:abc", kind: "browser", name: "Ideas", descriptor: browserDescriptor, openedAt: 1 };

function setup(recent: RecentVault[] = []) {
  const store = createStore();
  store.set(atom_recentVaults, recent);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return { store, wrapper };
}

describe("useRecentVaults", () => {
  beforeEach(() => vi.clearAllMocks());

  it("describes a disk vault by its folder and the others by their display name", () => {
    expect(recentVaultEntry("local:journal", folder, { kind: "local" }, 7)).toEqual({ ...LOCAL, openedAt: 7 });
    expect(recentVaultEntry("browser:abc", {} as FileSystemDirectoryHandle, browserDescriptor, 1)).toEqual(BROWSER);
  });

  it("leaves the open vault out of the list", () => {
    const { store, wrapper } = setup([LOCAL, BROWSER]);
    store.set(atom_vaultHandle, folder);
    const { result } = renderHook(() => useRecentVaults(), { wrapper });
    expect(result.current.recentVaults).toEqual([BROWSER]);
  });

  it("reopens a disk vault once access is granted, and not otherwise", async () => {
    const { wrapper } = setup([LOCAL]);
    const { result } = renderHook(() => useRecentVaults(), { wrapper });

    services.verifyPermission.mockResolvedValueOnce(false);
    await act(async () => { expect(await result.current.openRecentVault(LOCAL)).toBe(false); });
    expect(fs.initVaultFromHandle).not.toHaveBeenCalled();

    services.verifyPermission.mockResolvedValueOnce(true);
    await act(async () => { expect(await result.current.openRecentVault(LOCAL)).toBe(true); });
    expect(fs.initVaultFromHandle).toHaveBeenCalledWith(folder);
  });

  it("forgets a browser vault that no longer exists instead of creating an empty one", async () => {
    const { store, wrapper } = setup([BROWSER]);
    services.listBrowserVaultIds.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useRecentVaults(), { wrapper });

    await act(async () => { await result.current.openRecentVault(BROWSER); });
    expect(fs.openBrowserVault).not.toHaveBeenCalled();
    expect(store.get(atom_recentVaults)).toEqual([]);
    expect(services.saveRecentVaults).toHaveBeenCalledWith([]);
  });

  it("opens a browser vault with its latest registry entry", async () => {
    const { wrapper } = setup([BROWSER]);
    const latest = { ...browserDescriptor, lastExportedAt: 5 };
    services.listBrowserVaultIds.mockResolvedValueOnce(["abc"]);
    services.loadBrowserVaultRegistry.mockResolvedValueOnce([latest]);
    fs.openBrowserVault.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useRecentVaults(), { wrapper });

    await act(async () => { await result.current.openRecentVault(BROWSER); });
    expect(fs.openBrowserVault).toHaveBeenCalledWith(latest);
  });
});

describe("useRecentVaultTracker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the list, then moves the open vault to the top and saves it", async () => {
    const { store, wrapper } = setup();
    services.loadRecentVaults.mockResolvedValueOnce([BROWSER]);
    store.set(atom_vaultHandle, folder);
    store.set(atom_vaultDescriptor, { kind: "local" });

    renderHook(() => useRecentVaultTracker(), { wrapper });
    await act(async () => {});

    expect(store.get(atom_recentVaults).map((entry) => entry.key)).toEqual(["local:journal", "browser:abc"]);
    expect(services.saveRecentVaults).toHaveBeenLastCalledWith(store.get(atom_recentVaults));
  });
});
