import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useDeleteItem } from "./use-delete-item";
import { moveToTrash } from "./trash-ops";

const forgotten = vi.hoisted(() => [] as string[]);
vi.mock("@/app/atoms/pin-atoms", async () => {
  const { atom } = await import("jotai");
  return {
    atom_forgetPins: atom(null, (_get, _set, path: string) => { forgotten.push(path); }),
    atom_remapPins: atom(null, () => {}),
  };
});
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock("./trash-ops", () => ({ moveToTrash: vi.fn(async (_vault: unknown, path: string) => `.hermesmarkdown/trash/1/${path}`) }));
vi.mock("./undo-toast", () => ({ showUndoToast: vi.fn() }));
const dialog = vi.hoisted(() => ({ confirm: vi.fn(async (_message: string) => false) }));
vi.mock("../use-dialog", () => ({ useDialog: () => dialog }));

describe("useDeleteItem", () => {
  beforeEach(() => {
    forgotten.length = 0;
  });

  it("unpins a folder moved to the Trash, and everything under it", async () => {
    const store = createStore();
    store.set(atom_vaultHandle, { name: "vault" } as unknown as FileSystemDirectoryHandle);
    const { result } = renderHook(
      () => useDeleteItem({
        scanVault: vi.fn(async () => {}),
        indexVaultTags: vi.fn(async () => {}),
        recordUndo: vi.fn(() => null),
        undoFileOperation: vi.fn(async () => true),
      }),
      { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> },
    );

    await act(async () => {
      await result.current.trashItems([{ handle: { kind: "directory", name: "projects" } as FileSystemHandle, path: "projects" }]);
    });

    expect(forgotten).toEqual(["projects"]);
  });

  it("doesn't move the folder holding the Trash into it, and offers a permanent delete instead", async () => {
    const store = createStore();
    store.set(atom_vaultHandle, { name: "vault" } as unknown as FileSystemDirectoryHandle);
    vi.mocked(moveToTrash).mockClear();
    const { result } = renderHook(
      () => useDeleteItem({
        scanVault: vi.fn(async () => {}),
        indexVaultTags: vi.fn(async () => {}),
        recordUndo: vi.fn(() => null),
        undoFileOperation: vi.fn(async () => true),
      }),
      { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> },
    );

    await act(async () => {
      await result.current.trashItems([{ handle: { kind: "directory", name: ".hermesmarkdown" } as FileSystemHandle, path: ".hermesmarkdown" }]);
    });

    expect(moveToTrash).not.toHaveBeenCalled();
    expect(dialog.confirm.mock.calls[0][0]).toMatch(/holds the Trash/);
  });
});
