import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_openFiles, atom_vaultFiles, atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_openingVaultName, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_sidebarCollapsed, atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { collectVaultFiles, listDirectoryEntries } from "./vault-scan";
import { useVaultManager } from "./use-vault-manager";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
vi.mock("@/app/services/idb", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  saveVaultHandle: vi.fn(async () => {}),
  loadVaultHandle: vi.fn(async () => null),
  clearVaultHandle: vi.fn(async () => {}),
  queryPermission: vi.fn(async () => false),
}));
vi.mock("./vault-scan", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listDirectoryEntries: vi.fn(),
  collectVaultFiles: vi.fn(),
}));

const dir = (name: string) => ({ kind: "directory", name }) as unknown as FileSystemDirectoryHandle;
const file = (path: string) => ({ path, handle: { kind: "file", name: path } as unknown as FileSystemFileHandle });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

// Two components using the hook, like the app (useFileSystem runs in many).
function renderTwo(store: ReturnType<typeof createStore>) {
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  return [renderHook(() => useVaultManager(), { wrapper }).result, renderHook(() => useVaultManager(), { wrapper }).result];
}

afterEach(() => vi.clearAllMocks());

describe("useVaultManager, opening another vault", () => {
  it("drops a slower listing of the old vault", async () => {
    const store = createStore();
    const oldVault = dir("old");
    const newVault = dir("new");
    store.set(atom_vaultHandle, oldVault);
    const [first, second] = renderTwo(store);
    const oldListing = deferred<any[]>();
    vi.mocked(listDirectoryEntries).mockImplementation((_vault, handle) =>
      handle === oldVault ? oldListing.promise : Promise.resolve([{ name: "new.md" }]));
    vi.mocked(collectVaultFiles).mockResolvedValue({ files: [file("new.md")], folders: [], textFiles: [], failedSubdirs: 0, timedOut: false });

    let oldScan!: Promise<void>;
    act(() => { oldScan = first.current.scanVault(oldVault); });
    await act(() => second.current.initVaultFromHandle(newVault, { announce: false }));
    await act(async () => {
      oldListing.resolve([{ name: "old.md" }]);
      await oldScan;
    });

    expect(store.get(atom_vaultFiles)).toEqual([{ name: "new.md" }]);
  });

  it("drops a slower index of the old vault started in another component", async () => {
    const store = createStore();
    const oldVault = dir("old");
    const newVault = dir("new");
    store.set(atom_vaultHandle, oldVault);
    const [first, second] = renderTwo(store);
    vi.mocked(listDirectoryEntries).mockResolvedValue([]);
    const oldFiles = deferred<any>();
    vi.mocked(collectVaultFiles).mockImplementation((root) =>
      root === oldVault ? oldFiles.promise : Promise.resolve({ files: [file("new.md")], failedSubdirs: 0, timedOut: false }));

    let oldIndex!: Promise<void>;
    act(() => { oldIndex = first.current.indexVaultTags(oldVault); });
    await act(() => second.current.initVaultFromHandle(newVault, { announce: false }));
    await act(async () => {
      oldFiles.resolve({ files: [file("old.md")], failedSubdirs: 0, timedOut: false });
      await oldIndex;
    });

    expect(Object.keys(store.get(atom_fileMetadata))).toEqual(["new.md"]);
  });

  it("indexes the open vault when no folder is passed, even from an older callback", async () => {
    const store = createStore();
    const oldVault = dir("old");
    const newVault = dir("new");
    store.set(atom_vaultHandle, oldVault);
    const [first, second] = renderTwo(store);
    vi.mocked(listDirectoryEntries).mockResolvedValue([]);
    vi.mocked(collectVaultFiles).mockResolvedValue({ files: [], folders: [], textFiles: [], failedSubdirs: 0, timedOut: false });
    // A background sync holds the callback from before the switch.
    const indexFromBeforeSwitch = first.current.indexVaultTags;
    await act(() => second.current.initVaultFromHandle(newVault, { announce: false }));
    vi.mocked(collectVaultFiles).mockClear();

    await act(() => indexFromBeforeSwitch());

    expect(vi.mocked(collectVaultFiles).mock.calls.map(([root]) => root)).toEqual([newVault]);
  });

  it("clears the old vault's file list as soon as another opens", async () => {
    const store = createStore();
    store.set(atom_vaultFiles, [{ name: "old.md" }] as any);
    const [, second] = renderTwo(store);
    const listing = deferred<any[]>();
    vi.mocked(listDirectoryEntries).mockReturnValue(listing.promise);
    vi.mocked(collectVaultFiles).mockResolvedValue({ files: [], folders: [], textFiles: [], failedSubdirs: 0, timedOut: false });

    let opening!: Promise<void>;
    act(() => { opening = second.current.initVaultFromHandle(dir("new"), { announce: false }); });
    await act(async () => { await Promise.resolve(); });
    expect(store.get(atom_vaultFiles)).toEqual([]);
    await act(async () => {
      listing.resolve([{ name: "new.md" }]);
      await opening;
    });
    expect(store.get(atom_vaultFiles)).toEqual([{ name: "new.md" }]);
  });

  it("keeps the restored tabs when reopening the saved vault on load", async () => {
    const store = createStore();
    const layout = { rootContainer: { id: "default-pane", openFilePaths: ["a.md", "b.md"], activeFilePath: "b.md", isPinned: false } };
    const files = { "a.md": { content: "A", lastSavedContent: "A", fileName: "a", activeFilePath: "a.md" } };
    store.set(atom_workspaceLayout, layout);
    store.set(atom_openFiles, files);
    const [, second] = renderTwo(store);
    vi.mocked(listDirectoryEntries).mockResolvedValue([]);
    vi.mocked(collectVaultFiles).mockResolvedValue({ files: [], folders: [], textFiles: [], failedSubdirs: 0, timedOut: false });

    await act(() => second.current.initVaultFromHandle(dir("saved"), { persist: false, announce: false, keepTabs: true }));

    expect(store.get(atom_workspaceLayout)).toEqual(layout);
    expect(store.get(atom_openFiles)).toEqual(files);
  });

  it("shows the vault as opening until it's listed, then its Files", async () => {
    const store = createStore();
    store.set(atom_sidebarOpen, false);
    store.set(atom_sidebarCollapsed, { Files: true });
    const [, second] = renderTwo(store);
    const listing = deferred<any[]>();
    vi.mocked(listDirectoryEntries).mockReturnValue(listing.promise);
    vi.mocked(collectVaultFiles).mockResolvedValue({ files: [], folders: [], textFiles: [], failedSubdirs: 0, timedOut: false });

    let opening!: Promise<void>;
    act(() => { opening = second.current.initVaultFromHandle(dir("work")); });
    expect(store.get(atom_openingVaultName)).toBe("work");

    await act(async () => {
      listing.resolve([]);
      await opening;
    });

    expect(store.get(atom_openingVaultName)).toBeNull();
    expect(store.get(atom_sidebarOpen)).toBe(true);
    expect(store.get(atom_sidebarCollapsed).Files).toBe(false);
  });
});
