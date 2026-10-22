import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import toast from "react-hot-toast";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { useMoveItem } from "./use-move-item";

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/app/services/content-search-client", () => ({ remapNoteContent: vi.fn() }));
const showUndoToast = vi.hoisted(() => vi.fn());
vi.mock("./undo-toast", () => ({ showUndoToast }));
const rewriteLinks = vi.fn();
vi.mock("./use-rewrite-links", () => ({ useRewriteLinksAfterMove: () => rewriteLinks }));

async function setup() {
  const vault = new MemoryDirectoryHandle("vault");
  await vault.writeText("Old.md", "x");
  const dest = await vault.getDirectoryHandle("dest", { create: true });
  // The in-memory handles have no resolve(); answer for the two we use.
  const paths = new Map<unknown, string[]>([[vault.fileAt("Old.md"), ["Old.md"]], [dest, ["dest"]]]);
  (vault as unknown as { resolve: (h: unknown) => Promise<string[] | null> }).resolve = async (h) => paths.get(h) ?? null;
  const store = createStore();
  store.set(atom_vaultHandle, vault.asHandle());
  const order: string[] = [];
  const scanVault = vi.fn(async () => { order.push("scan"); });
  const recordUndo = vi.fn(() => { order.push("remap+undo"); return null; });
  const { result } = renderHook(
    () => useMoveItem({ scanVault, indexVaultTags: vi.fn().mockResolvedValue(undefined), recordUndo, undoFileOperation: vi.fn() }),
    { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> },
  );
  const move = async () => {
    await act(async () => { await result.current.moveItem(vault.fileAt("Old.md") as never, dest as never); });
  };
  return { order, move };
}

describe("useMoveItem link updates", () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    showUndoToast.mockClear();
    rewriteLinks.mockReset();
    rewriteLinks.mockResolvedValue({ updated: 0, failed: 0 });
  });

  it("rewrites links after the move and before the rescan", async () => {
    const { order, move } = await setup();
    rewriteLinks.mockImplementation(async () => { order.push("rewrite"); return { updated: 0, failed: 0 }; });
    await move();
    expect(order).toEqual(["rewrite", "scan", "remap+undo"]);
    expect(rewriteLinks).toHaveBeenCalledWith(expect.anything(), [{ from: "Old.md", to: "dest/Old.md" }]);
  });

  it("adds the updated-notes count to the move toast only when links changed", async () => {
    const plain = await setup();
    await plain.move();
    expect(toast.success).toHaveBeenCalledWith("Moved Old.md to dest");

    vi.mocked(toast.success).mockClear();
    const linked = await setup();
    rewriteLinks.mockResolvedValue({ updated: 3, failed: 2 });
    await linked.move();
    expect(toast.success).toHaveBeenCalledWith("Moved Old.md to dest · updated links in 3 notes");
    expect(toast.error).toHaveBeenCalledWith("Couldn't update links in 2 notes");
  });

  it("still rescans when the rewrite throws", async () => {
    const { order, move } = await setup();
    rewriteLinks.mockRejectedValue(new Error("boom"));
    await move();
    expect(toast.error).toHaveBeenCalledWith("Couldn't update links");
    expect(order).toContain("scan");
  });
});
