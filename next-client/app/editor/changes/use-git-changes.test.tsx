import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_gitChangesCache } from "@/app/atoms/git-atoms";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import type { ChangesResult } from "@/app/services/git/git-changes-types";
import { useGitChanges } from "./use-git-changes";

type Scan = { vault: unknown; resolve: (result: ChangesResult | "cancelled") => void; cancel: ReturnType<typeof vi.fn> };
const scans: Scan[] = [];
vi.mock("@/app/services/git-changes-client", () => ({
  startChangesScan: (vault: unknown) => {
    let resolve!: Scan["resolve"];
    const result = new Promise<ChangesResult | "cancelled">((done) => (resolve = done));
    const cancel = vi.fn();
    scans.push({ vault, resolve, cancel });
    return { result, cancel };
  },
}));

const saved = vi.hoisted(() => ({ result: null as unknown, save: vi.fn() }));
vi.mock("@/app/services/changes-cache", () => ({
  loadChangesCache: async () => saved.result,
  saveChangesCache: (...args: unknown[]) => saved.save(...args),
}));

const vaultA = { name: "a" } as FileSystemDirectoryHandle;
const vaultB = { name: "b" } as FileSystemDirectoryHandle;
const ok = (commit: string): ChangesResult => ({ status: "ok", commit, files: [] });

function setup(vault: FileSystemDirectoryHandle | null, store = createStore()) {
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return { store, ...renderHook(({ v }) => useGitChanges(v, true), { wrapper, initialProps: { v: vault } }) };
}

describe("useGitChanges", () => {
  beforeEach(() => {
    scans.length = 0;
    saved.result = null;
    saved.save.mockClear();
  });

  it("shows the result saved for the vault while the first scan runs, then saves the new one", async () => {
    saved.result = ok("saved");
    const store = createStore();
    store.set(atom_vaultHandle, vaultA);
    store.set(atom_vaultDescriptor, { kind: "local" });
    const { result } = setup(vaultA, store);
    await act(async () => {});
    expect(result.current.result).toEqual(ok("saved"));
    await act(async () => scans[0].resolve(ok("fresh")));
    expect(result.current.result).toEqual(ok("fresh"));
    expect(saved.save).toHaveBeenCalledWith("local:a", ok("fresh"));
  });
  afterEach(cleanup);

  it("starts a scan on mount and shows its result", async () => {
    const { result } = setup(vaultA);
    expect(scans).toHaveLength(1);
    expect(result.current.scanning).toBe(true);
    await act(async () => scans[0].resolve(ok("abc")));
    expect(result.current.scanning).toBe(false);
    expect(result.current.result).toEqual(ok("abc"));
  });

  it("queues exactly one rescan for focus events during a scan", async () => {
    setup(vaultA);
    act(() => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("focus"));
    });
    expect(scans).toHaveLength(1);
    await act(async () => scans[0].resolve(ok("a")));
    expect(scans).toHaveLength(2);
  });

  it("cancels the scan on unmount", () => {
    const { unmount } = setup(vaultA);
    unmount();
    expect(scans[0].cancel).toHaveBeenCalled();
  });

  it("shows the cache at once for the same vault only", () => {
    const store = createStore();
    store.set(atom_gitChangesCache, { vault: vaultA, result: ok("cached") });
    expect(setup(vaultA, store).result.current.result).toEqual(ok("cached"));
    cleanup();
    expect(setup(vaultB, store).result.current.result).toBeNull();
  });

  it("ignores a stale result after the vault changes", async () => {
    const { result, rerender } = setup(vaultA);
    rerender({ v: vaultB });
    expect(scans).toHaveLength(2);
    expect(scans[0].cancel).toHaveBeenCalled();
    await act(async () => scans[0].resolve(ok("stale")));
    expect(result.current.result).toBeNull();
    await act(async () => scans[1].resolve(ok("fresh")));
    expect(result.current.result).toEqual(ok("fresh"));
  });
});
