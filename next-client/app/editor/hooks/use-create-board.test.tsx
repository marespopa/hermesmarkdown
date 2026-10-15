import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import React from "react";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_newNoteFolder } from "@/app/atoms/ui-atoms";
import { NEW_BOARD_MARKDOWN } from "@/app/utils/board/board-format";
import { boardBaseName, useCreateBoard } from "./use-create-board";

const prompt = vi.fn();
vi.mock("@/app/hooks/use-dialog", () => ({ useDialog: () => ({ prompt }) }));

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
    prompt.mockResolvedValue("Untitled");
  });

  it("creates the named board in the New Notes folder", async () => {
    prompt.mockResolvedValue("Sprint plan");
    const { createFile, createBoard } = setup("inbox");
    await createBoard();
    expect(prompt).toHaveBeenCalledWith("Board name:", "Untitled", "New board");
    expect(ensureVaultFolder).toHaveBeenCalledWith(vault, "inbox");
    expect(createFile).toHaveBeenCalledWith("Sprint plan.board", NEW_BOARD_MARKDOWN, folder);
  });

  it.each([null, "", "   "])("creates nothing when the prompt gives %j", async (answer) => {
    prompt.mockResolvedValue(answer);
    const { createFile, createBoard } = setup();
    await createBoard();
    expect(createFile).not.toHaveBeenCalled();
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

describe("boardBaseName", () => {
  it.each([
    ["Sprint plan", "Sprint plan.board"],
    ["  Sprint plan  ", "Sprint plan.board"],
    ["Sprint plan.md", "Sprint plan.board"],
    ["Sprint plan.board", "Sprint plan.board"],
    ["Sprint plan.board.md", "Sprint plan.board"],
    [".board.md", null],
    ["", null],
  ])("%j -> %j", (input, expected) => {
    expect(boardBaseName(input)).toBe(expected);
  });
});
