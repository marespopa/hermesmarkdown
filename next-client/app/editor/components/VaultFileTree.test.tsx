import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultFileTree from "./VaultFileTree";

vi.mock("jotai", async (importOriginal) => ({
  ...await importOriginal<typeof import("jotai")>(),
  useAtomValue: vi.fn(() => "idle"),
}));

const fileHandle = { kind: "file", name: "note.md" } as FileSystemFileHandle;

function renderFiles(overrides: Partial<React.ComponentProps<typeof VaultFileTree>> = {}) {
  const props: React.ComponentProps<typeof VaultFileTree> = {
    processedFiles: [{ name: "note.md", path: "note.md", handle: fileHandle }],
    activeFilePath: null,
    openFile: vi.fn(),
    renameFile: vi.fn(),
    deleteFile: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<VaultFileTree {...props} />) };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("VaultFileTree tree interactions", () => {
  it("opens files via double-click or the file options menu, but not single-click", () => {
    const { props } = renderFiles();

    fireEvent.click(screen.getByText("note"));
    expect(props.openFile).not.toHaveBeenCalled();

    fireEvent.doubleClick(screen.getByText("note"));
    expect(props.openFile).toHaveBeenCalledWith(fileHandle, "note.md");
    expect(props.openFile).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("File options"));
    fireEvent.click(screen.getByText("Open file"));
    expect(props.openFile).toHaveBeenCalledWith(fileHandle, "note.md");
    expect(props.openFile).toHaveBeenCalledTimes(2);
  });

  it("auto-expands a valid closed drop target after 400ms", () => {
    vi.useFakeTimers();
    renderFiles({
      treeView: true,
      folderPaths: ["Folder"],
      processedFiles: [
        { name: "note.md", path: "note.md", handle: fileHandle },
        { name: "nested.md", path: "Folder/nested.md", handle: { kind: "file", name: "nested.md" } },
      ],
    });

    const source = screen.getByText("note").closest("[draggable]");
    const target = screen.getByText("Folder").closest("[draggable]");
    expect(source).not.toBeNull();
    expect(target).not.toBeNull();

    fireEvent.dragStart(source!, { dataTransfer: { effectAllowed: "", dropEffect: "" } });
    fireEvent.dragOver(target!, { dataTransfer: { effectAllowed: "", dropEffect: "" } });
    expect(screen.queryByText("nested")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText("nested")).toBeInTheDocument();
  });

  it("cancels pending auto-expand when the drag leaves", () => {
    vi.useFakeTimers();
    renderFiles({
      treeView: true,
      folderPaths: ["Folder"],
      processedFiles: [
        { name: "note.md", path: "note.md", handle: fileHandle },
        { name: "nested.md", path: "Folder/nested.md", handle: { kind: "file", name: "nested.md" } },
      ],
    });

    const source = screen.getByText("note").closest("[draggable]");
    const target = screen.getByText("Folder").closest("[draggable]");
    fireEvent.dragStart(source!, { dataTransfer: { effectAllowed: "", dropEffect: "" } });
    fireEvent.dragOver(target!, { dataTransfer: { effectAllowed: "", dropEffect: "" } });
    fireEvent.dragLeave(target!);

    act(() => vi.advanceTimersByTime(400));
    expect(screen.queryByText("nested")).not.toBeInTheDocument();
  });

  it("moves a dropped file into the target folder", async () => {
    const folderHandle = { kind: "directory", name: "Folder" } as FileSystemDirectoryHandle;
    const resolveFolderHandle = vi.fn().mockResolvedValue(folderHandle);
    const moveItem = vi.fn();
    renderFiles({
      treeView: true,
      folderPaths: ["Folder"],
      resolveFolderHandle,
      moveItem,
    });

    const source = screen.getByText("note").closest("[draggable]");
    const target = screen.getByText("Folder").closest("[draggable]");
    fireEvent.dragStart(source!, { dataTransfer: { effectAllowed: "", dropEffect: "" } });
    fireEvent.dragOver(target!, { dataTransfer: { effectAllowed: "", dropEffect: "" } });
    fireEvent.drop(target!, { dataTransfer: { effectAllowed: "", dropEffect: "" } });

    await waitFor(() => {
      expect(resolveFolderHandle).toHaveBeenCalledWith("Folder");
      expect(moveItem).toHaveBeenCalledWith(fileHandle, folderHandle);
    });
  });

  it("opens the shared folder creation flow from a folder options menu", async () => {
    const createFolder = vi.fn().mockResolvedValue(null);
    renderFiles({
      treeView: true,
      folderPaths: ["Folder"],
      createFolder,
    });

    fireEvent.click(screen.getByLabelText("Folder options"));
    fireEvent.click(screen.getByText("New Folder"));

    await waitFor(() => {
      expect(createFolder).toHaveBeenCalledWith();
    });
  });

  it("opens the shared rename dialog for files", () => {
    const { props } = renderFiles();

    fireEvent.click(screen.getByLabelText("File options"));
    fireEvent.click(screen.getByText("Rename"));

    expect(props.renameFile).toHaveBeenCalledWith(fileHandle);
  });

  it("opens the shared rename dialog with a freshly resolved folder handle", async () => {
    const folderHandle = { kind: "directory", name: "Folder" };
    const resolveFolderHandle = vi.fn().mockResolvedValue(folderHandle);
    const { props } = renderFiles({
      treeView: true,
      folderPaths: ["Folder"],
      resolveFolderHandle,
    });

    fireEvent.click(screen.getByLabelText("Folder options"));
    fireEvent.click(screen.getByText("Rename"));

    await waitFor(() => {
      expect(resolveFolderHandle).toHaveBeenCalledWith("Folder");
      expect(props.renameFile).toHaveBeenCalledWith(folderHandle);
    });
  });
});
