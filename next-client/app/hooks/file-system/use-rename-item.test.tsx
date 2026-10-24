import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import toast from "react-hot-toast";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { useRenameItem } from "./use-rename-item";

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/app/services/content-search-client", () => ({ remapNoteContent: vi.fn() }));
vi.mock("../use-dialog", () => ({ useDialog: () => ({ prompt: vi.fn() }) }));
const rewriteLinks = vi.fn();
vi.mock("./use-rewrite-links", () => ({ useRewriteLinksAfterMove: () => rewriteLinks }));

function storeWith(vault: MemoryDirectoryHandle) {
  const store = createStore();
  store.set(atom_vaultHandle, vault.asHandle());
  return store;
}

async function setup() {
  const vault = new MemoryDirectoryHandle("vault");
  await vault.writeText("Old.md", "x");
  const store = createStore();
  store.set(atom_vaultHandle, vault.asHandle());
  const order: string[] = [];
  const scanVault = vi.fn(async () => { order.push("scan"); });
  const recordUndo = vi.fn(() => { order.push("remap+undo"); return null; });
  const { result } = renderHook(
    () => useRenameItem({ scanVault, indexVaultTags: vi.fn().mockResolvedValue(undefined), recordUndo }),
    { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> },
  );
  const rename = async () => {
    const handle = await vault.asHandle().getFileHandle("Old.md");
    let path: string | undefined;
    await act(async () => { path = await result.current.renameFile(handle, "New.md", "Old.md"); });
    return path;
  };
  return { order, rename, vault, scanVault };
}

describe("useRenameItem link updates", () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    rewriteLinks.mockReset();
    rewriteLinks.mockResolvedValue({ updated: 0, failed: 0 });
  });

  it("rewrites links after the remap and before the rescan", async () => {
    const { order, rename } = await setup();
    rewriteLinks.mockImplementation(async () => { order.push("rewrite"); return { updated: 0, failed: 0 }; });
    expect(await rename()).toBe("New.md");
    expect(order).toEqual(["remap+undo", "rewrite", "scan"]);
    expect(rewriteLinks).toHaveBeenCalledWith(expect.anything(), [{ from: "Old.md", to: "New.md" }]);
  });

  it("toasts the count of updated notes, and nothing when none changed", async () => {
    const first = await setup();
    rewriteLinks.mockResolvedValue({ updated: 2, failed: 1 });
    await first.rename();
    expect(toast.success).toHaveBeenCalledWith("Updated links in 2 notes");
    expect(toast.error).toHaveBeenCalledWith("Couldn't update links in 1 note");

    vi.mocked(toast.success).mockClear();
    const second = await setup();
    rewriteLinks.mockResolvedValue({ updated: 0, failed: 0 });
    await second.rename();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("still rescans when the rewrite throws", async () => {
    const { order, rename } = await setup();
    rewriteLinks.mockRejectedValue(new Error("boom"));
    expect(await rename()).toBe("New.md");
    expect(toast.error).toHaveBeenCalledWith("Couldn't update links");
    expect(order).toContain("scan");
  });

  it("says plainly when the item is gone from disk, and rescans", async () => {
    const { vault, scanVault } = await setup();
    const handle = await vault.asHandle().getFileHandle("Old.md");
    await vault.asHandle().removeEntry("Old.md");
    const { result } = renderHook(
      () => useRenameItem({ scanVault, indexVaultTags: vi.fn().mockResolvedValue(undefined), recordUndo: vi.fn(() => null) }),
      { wrapper: ({ children }) => <Provider store={storeWith(vault)}>{children}</Provider> },
    );

    let path: string | undefined;
    await act(async () => { path = await result.current.renameFile(handle, "New.md", "Old.md"); });

    expect(path).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith(`Couldn't rename "Old.md": it's no longer in this folder.`);
    expect(scanVault).toHaveBeenCalled();
  });

  it("changes only the letter case through an unused name, leaving no copy", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("Draft.md", "x");
    const { result } = renderHook(
      () => useRenameItem({ scanVault: vi.fn(async () => {}), indexVaultTags: vi.fn().mockResolvedValue(undefined), recordUndo: vi.fn(() => null) }),
      { wrapper: ({ children }) => <Provider store={storeWith(vault)}>{children}</Provider> },
    );
    const handle = await vault.asHandle().getFileHandle("Draft.md");

    let path: string | undefined;
    await act(async () => { path = await result.current.renameFile(handle, "draft.md", "Draft.md"); });

    expect(path).toBe("draft.md");
    const names: string[] = [];
    for await (const entry of (vault.asHandle() as any).values()) names.push(entry.name);
    expect(names).toEqual(["draft.md"]);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
