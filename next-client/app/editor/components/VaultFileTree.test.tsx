import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultFileTree from "./VaultFileTree";

vi.mock("jotai", async (importOriginal) => ({
  ...await importOriginal<typeof import("jotai")>(),
  useAtomValue: vi.fn(() => "idle"),
}));

const fileHandle = { kind: "file", name: "note.md" } as FileSystemFileHandle;

function renderFiles(
  overrides: Partial<React.ComponentProps<typeof VaultFileTree>> = {},
  store = createStore(),
) {
  const props: React.ComponentProps<typeof VaultFileTree> = {
    processedFiles: [{ name: "note.md", path: "note.md", handle: fileHandle }],
    activeFilePath: null,
    openFile: vi.fn(),
    renameFile: vi.fn(),
    deleteFile: vi.fn(),
    ...overrides,
  };
  return {
    props,
    store,
    ...render(
      <Provider store={store}>
        <VaultFileTree {...props} />
      </Provider>,
    ),
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  // Folder expansion persists via atomWithStorage; don't leak it between tests.
  localStorage.clear();
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

  it("opens files on a single click with singleClickOpen", () => {
    const { props } = renderFiles({ singleClickOpen: true });

    fireEvent.click(screen.getByText("note"));
    expect(props.openFile).toHaveBeenCalledWith(fileHandle, "note.md");
    expect(props.openFile).toHaveBeenCalledTimes(1);

    fireEvent.doubleClick(screen.getByText("note"));
    expect(props.openFile).toHaveBeenCalledTimes(1);
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

  it("moves a file into a folder with a long-press touch drag", async () => {
    vi.useFakeTimers();
    const folderHandle = { kind: "directory", name: "Folder" } as FileSystemDirectoryHandle;
    const resolveFolderHandle = vi.fn().mockResolvedValue(folderHandle);
    const moveItem = vi.fn();
    renderFiles({ treeView: true, folderPaths: ["Folder"], resolveFolderHandle, moveItem });

    const source = screen.getByText("note").closest("[draggable]")!;
    const target = screen.getByText("Folder").closest("[draggable]")!;
    document.elementFromPoint = vi.fn(() => target);

    fireEvent.touchStart(source, { touches: [{ clientX: 10, clientY: 10 }] });
    act(() => vi.advanceTimersByTime(350));
    fireEvent.touchMove(document, { touches: [{ clientX: 10, clientY: 60 }] });
    fireEvent.touchEnd(document, { touches: [] });
    vi.useRealTimers();

    await waitFor(() => expect(moveItem).toHaveBeenCalledWith(fileHandle, folderHandle));
  });

  it("treats a quick swipe as a scroll, not a touch drag", () => {
    vi.useFakeTimers();
    const moveItem = vi.fn();
    renderFiles({ treeView: true, folderPaths: ["Folder"], resolveFolderHandle: vi.fn(), moveItem });

    const source = screen.getByText("note").closest("[draggable]")!;
    document.elementFromPoint = vi.fn(() => screen.getByText("Folder"));

    fireEvent.touchStart(source, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchMove(document, { touches: [{ clientX: 10, clientY: 60 }] });
    act(() => vi.advanceTimersByTime(350));
    fireEvent.touchEnd(document, { touches: [] });

    expect(moveItem).not.toHaveBeenCalled();
  });

  it("creates a subfolder inside the folder whose options menu was used", async () => {
    const folderHandle = { kind: "directory", name: "Folder" };
    const resolveFolderHandle = vi.fn().mockResolvedValue(folderHandle);
    const createFolder = vi.fn().mockResolvedValue(null);
    renderFiles({
      treeView: true,
      folderPaths: ["Folder"],
      resolveFolderHandle,
      createFolder,
    });

    fireEvent.click(screen.getByLabelText("Folder options"));
    fireEvent.click(screen.getByText("New Folder"));

    await waitFor(() => {
      expect(resolveFolderHandle).toHaveBeenCalledWith("Folder");
      expect(createFolder).toHaveBeenCalledWith(folderHandle);
    });
  });

  it("creates a note inside the folder and expands it", async () => {
    const folderHandle = { kind: "directory", name: "Folder" };
    const resolveFolderHandle = vi.fn().mockResolvedValue(folderHandle);
    const createNewFile = vi.fn();
    renderFiles({
      treeView: true,
      folderPaths: ["Folder"],
      processedFiles: [{ name: "nested.md", path: "Folder/nested.md", handle: { kind: "file", name: "nested.md" } }],
      resolveFolderHandle,
      createNewFile,
    });
    expect(screen.queryByText("nested")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Folder options"));
    fireEvent.click(screen.getByText("New File"));

    await waitFor(() => {
      expect(createNewFile).toHaveBeenCalledWith(folderHandle);
      expect(screen.getByText("nested")).toBeInTheDocument();
    });
  });

  it("remembers expanded folders across remounts", () => {
    const tree = {
      treeView: true,
      folderPaths: ["Folder"],
      processedFiles: [{ name: "nested.md", path: "Folder/nested.md", handle: { kind: "file", name: "nested.md" } }],
    };
    const { store, unmount } = renderFiles(tree);
    fireEvent.click(screen.getByText("Folder"));
    expect(screen.getByText("nested")).toBeInTheDocument();

    unmount();
    renderFiles(tree, store);
    expect(screen.getByText("nested")).toBeInTheDocument();
  });

  it("opens the shared rename dialog for files", () => {
    const { props } = renderFiles();

    fireEvent.click(screen.getByLabelText("File options"));
    fireEvent.click(screen.getByText("Rename"));

    expect(props.renameFile).toHaveBeenCalledWith(fileHandle, undefined, "note.md");
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
      expect(props.renameFile).toHaveBeenCalledWith(folderHandle, undefined, "Folder");
    });
  });

  it("reveals the active file once, not again each time the file list refreshes", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const other = { kind: "file", name: "other.md" } as FileSystemFileHandle;
    const files = [{ name: "note.md", path: "note.md", handle: fileHandle }];
    const { props, store, rerender } = renderFiles({ activeFilePath: "note.md", processedFiles: files });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    // A large vault's scan and file watcher hand over a new list again and again.
    const refreshed = [...files, { name: "other.md", path: "other.md", handle: other }];
    const renderWith = (overrides: Partial<React.ComponentProps<typeof VaultFileTree>>) =>
      rerender(<Provider store={store}><VaultFileTree {...props} {...overrides} /></Provider>);
    renderWith({ activeFilePath: "note.md", processedFiles: refreshed });
    renderWith({ activeFilePath: "note.md", processedFiles: [...refreshed] });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    // Opening another note still reveals it.
    renderWith({ activeFilePath: "other.md", processedFiles: [...refreshed] });
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });
});
