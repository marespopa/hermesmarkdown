import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { atom_gitChangesCache } from "@/app/atoms/atoms";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useBackgroundGitScan } from "./use-background-git-scan";

let pathname = "/editor";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
const startChangesScan = vi.fn();
vi.mock("@/app/services/git-changes-client", () => ({ startChangesScan: (...args: unknown[]) => startChangesScan(...args) }));
vi.mock("@/app/services/changes-cache", () => ({ saveChangesCache: vi.fn() }));

function Mount({ enabled = true }: { enabled?: boolean }) {
  useBackgroundGitScan(enabled);
  return null;
}

function setup(enabled = true) {
  const store = createStore();
  const vault = { name: "v" } as FileSystemDirectoryHandle;
  store.set(atom_vaultHandle, vault);
  store.set(atom_vaultDescriptor, { kind: "local" } as never);
  const view = render(<Provider store={store}><Mount enabled={enabled} /></Provider>);
  return { store, vault, view };
}

describe("useBackgroundGitScan", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathname = "/editor";
    startChangesScan.mockReset();
    startChangesScan.mockReturnValue({ result: Promise.resolve({ status: "ok", files: [] }), cancel: vi.fn() });
  });
  afterEach(() => vi.useRealTimers());

  it("scans once after the startup delay and fills the Changes cache", async () => {
    const { store, vault } = setup();
    expect(startChangesScan).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(startChangesScan).toHaveBeenCalledTimes(1);
    expect(store.get(atom_gitChangesCache)?.vault).toBe(vault);
  });

  it("does not scan while the vault is locked or the Changes page is open", async () => {
    setup(false);
    pathname = "/editor/changes";
    setup();
    await vi.advanceTimersByTimeAsync(15000);
    expect(startChangesScan).not.toHaveBeenCalled();
  });

  it("cancels the scan when leaving", async () => {
    const cancel = vi.fn();
    startChangesScan.mockReturnValue({ result: new Promise(() => {}), cancel });
    const { view } = setup();
    await vi.advanceTimersByTimeAsync(5000);
    view.unmount();
    expect(cancel).toHaveBeenCalled();
  });
});
