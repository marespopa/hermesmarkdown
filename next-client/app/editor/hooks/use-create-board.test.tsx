import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import React from "react";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_newNoteFolder } from "@/app/atoms/ui-atoms";
import { NEW_BOARD_MARKDOWN } from "@/app/utils/board/board-format";
import { useCreateBoard } from "./use-create-board";

const ensureVaultFolder = vi.fn();
vi.mock("@/app/hooks/file-system/unique-file", () => ({
  ensureVaultFolder: (...args: unknown[]) => ensureVaultFolder(...args),
  normalizeFolderPath: (p: string) => p.trim(),
}));
const toastError = vi.fn();
vi.mock("react-hot-toast", () => ({ default: { error: (...a: unknown[]) => toastError(...a) } }));

const vault = { name: "vault" } as unknown as FileSystemDirectoryHandle;
const folder = { name: "inbox" } as unknown as FileSystemDirectoryHandle;

function setup(newNoteFolder = "") {
  const store = createStore();
  store.set(atom_vaultHandle, vault);
  store.set(atom_newNoteFolder, newNoteFolder);
  const createFile = vi.fn().mockResolvedValue(null);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useCreateBoard(createFile), { wrapper });
  return { createFile, createBoard: result.current };
}

describe("useCreateBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureVaultFolder.mockResolvedValue(folder);
  });

  it("creates Untitled.board in the New Notes folder", async () => {
    const { createFile, createBoard } = setup("inbox");
    await createBoard();
    expect(ensureVaultFolder).toHaveBeenCalledWith(vault, "inbox");
    expect(createFile).toHaveBeenCalledWith("Untitled.board", NEW_BOARD_MARKDOWN, folder);
  });

  it("uses the vault root when the folder is empty", async () => {
    const { createBoard } = setup("");
    await createBoard();
    expect(ensureVaultFolder).toHaveBeenCalledWith(vault, "");
  });

  it("shows an error toast when creation throws", async () => {
    ensureVaultFolder.mockRejectedValue(new Error("denied"));
    const { createFile, createBoard } = setup();
    await createBoard();
    expect(createFile).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Couldn't create the board.");
  });
});
