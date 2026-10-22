import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { atom_openFiles, atom_liveHandles, contentStore } from "@/app/atoms/atoms";
import { registerBoardFlush } from "@/app/utils/board/board-flush";
import { usePaneFileActions } from "./use-pane-file-actions";

const saveFile = vi.fn().mockResolvedValue(true);
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ saveFile, exportFile: vi.fn(), scanVault: vi.fn(), indexVaultTags: vi.fn() }),
}));
vi.mock("./use-materialize-draft", () => ({ useMaterializeDraft: () => vi.fn() }));

const handle = { name: "b.board.md" } as unknown as FileSystemFileHandle;
const leaf = { id: "p", openFilePaths: ["b.board.md"], activeFilePath: "b.board.md", isPinned: false };

describe("usePaneFileActions with a board", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contentStore.set(atom_openFiles, {
      "b.board.md": { fileName: "b.board.md", content: "old", lastSavedContent: "old", activeFilePath: "b.board.md" },
    } as any);
    contentStore.set(atom_liveHandles("b.board.md"), handle);
  });

  it("closeTabWithAutosave flushes the board before reading the file state", async () => {
    const off = registerBoardFlush("b.board.md", () => {
      contentStore.set(atom_openFiles, (prev: any) => ({ ...prev, "b.board.md": { ...prev["b.board.md"], content: "new stroke" } }));
    });
    const { result } = renderHook(() => usePaneFileActions(leaf));
    await act(async () => {
      await result.current.closeTabWithAutosave("b.board.md");
    });
    expect(saveFile).toHaveBeenCalledWith("new stroke", handle, 0, true, "b.board.md");
    off();
  });

  it("handleSave flushes the board and saves the store's text", async () => {
    const off = registerBoardFlush("b.board.md", () => {
      contentStore.set(atom_openFiles, (prev: any) => ({ ...prev, "b.board.md": { ...prev["b.board.md"], content: "saved stroke" } }));
    });
    const { result } = renderHook(() => usePaneFileActions(leaf));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(saveFile).toHaveBeenCalledWith("saved stroke", handle, 0, false, "b.board.md");
    off();
  });
});
