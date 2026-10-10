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
    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
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

  it("names a new subfolder in place inside the folder whose options menu was used", async () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "New Folder" }));

    const field = screen.getByLabelText("New folder name") as HTMLInputElement;
    expect(field.value).toBe("untitled folder");
    fireEvent.change(field, { target: { value: "Plans" } });
    fireEvent.keyDown(field, { key: "Enter" });

    await waitFor(() => {
      expect(resolveFolderHandle).toHaveBeenCalledWith("Folder");
      expect(createFolder).toHaveBeenCalledWith(folderHandle, "Plans");
    });
    expect(screen.queryByLabelText("New folder name")).not.toBeInTheDocument();
  });

  it("names a new note in place inside the folder and expands it", async () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "New Note" }));
    expect(screen.getByText("nested")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText("New note name"), { key: "Enter" });

    await waitFor(() => expect(createNewFile).toHaveBeenCalledWith(folderHandle, "Untitled"));
  });

  it("creates nothing when naming a new item is cancelled with Escape", () => {
    const createFolder = vi.fn();
    renderFiles({ treeView: true, folderPaths: ["Folder"], resolveFolderHandle: vi.fn(), createFolder });

    fireEvent.click(screen.getByLabelText("Folder options"));
    fireEvent.click(screen.getByRole("menuitem", { name: "New Folder" }));
    fireEvent.keyDown(screen.getByLabelText("New folder name"), { key: "Escape" });

    expect(screen.queryByLabelText("New folder name")).not.toBeInTheDocument();
    expect(createFolder).not.toHaveBeenCalled();
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

  it("renames a folder in place with a freshly resolved handle", async () => {
    const folderHandle = { kind: "directory", name: "Folder" };
    const resolveFolderHandle = vi.fn().mockResolvedValue(folderHandle);
    const { props } = renderFiles({
      treeView: true,
      folderPaths: ["Folder"],
      resolveFolderHandle,
    });

    fireEvent.click(screen.getByLabelText("Folder options"));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Rename/ }));
    const field = screen.getByLabelText("Folder name") as HTMLInputElement;
    expect(field.value).toBe("Folder");
    fireEvent.change(field, { target: { value: "Archive" } });
    fireEvent.keyDown(field, { key: "Enter" });

    await waitFor(() => {
      expect(resolveFolderHandle).toHaveBeenCalledWith("Folder");
      expect(props.renameFile).toHaveBeenCalledWith(folderHandle, "Archive", "Folder");
    });
  });

  it("renames a note in place, keeping its .md extension, and leaves it be when unchanged", async () => {
    const { props } = renderFiles({ treeView: true });

    fireEvent.click(screen.getByLabelText("File options"));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Rename/ }));
    fireEvent.keyDown(screen.getByLabelText("Note name"), { key: "Enter" });
    expect(props.renameFile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("File options"));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Rename/ }));
    const field = screen.getByLabelText("Note name");
    fireEvent.change(field, { target: { value: "plan" } });
    fireEvent.blur(field);

    await waitFor(() => expect(props.renameFile).toHaveBeenCalledWith(fileHandle, "plan.md", "note.md"));
  });

  it("reveals the active file once, not again each time the file list refreshes", () => {
    // vitest.setup.ts stubs it on HTMLElement.prototype; spy on that.
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});
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
    scrollIntoView.mockRestore();
  });
});

describe("VaultFileTree selection, keyboard and menus", () => {
  const files = [
    { name: "a.md", path: "a.md", handle: { kind: "file", name: "a.md" } },
    { name: "b.md", path: "b.md", handle: { kind: "file", name: "b.md" } },
    { name: "c.md", path: "c.md", handle: { kind: "file", name: "c.md" } },
  ];
  const selectedNames = () =>
    screen.queryAllByRole("treeitem", { selected: true }).map((row) => row.textContent);

  it("selects with a click, adds with Ctrl/⌘-click and extends with Shift-click", () => {
    renderFiles({ treeView: true, processedFiles: files });

    fireEvent.click(screen.getByText("a"));
    expect(selectedNames()).toEqual(["a"]);
    fireEvent.click(screen.getByText("c"), { ctrlKey: true });
    expect(selectedNames()).toEqual(["a", "c"]);
    fireEvent.click(screen.getByText("a"));
    fireEvent.click(screen.getByText("c"), { shiftKey: true });
    expect(selectedNames()).toEqual(["a", "b", "c"]);
  });

  it("selects the file that was opened, once per change of active file", () => {
    const { props, store, rerender } = renderFiles({ treeView: true, processedFiles: files, activeFilePath: "a.md" });
    expect(selectedNames()).toEqual(["a"]);
    const renderWith = (overrides: Partial<React.ComponentProps<typeof VaultFileTree>>) =>
      rerender(<Provider store={store}><VaultFileTree {...props} {...overrides} /></Provider>);

    // Opened from elsewhere (palette, link, tab): the selection follows.
    renderWith({ activeFilePath: "c.md" });
    expect(selectedNames()).toEqual(["c"]);

    // A selection made since stands while the same file stays open.
    fireEvent.click(screen.getByText("b"), { ctrlKey: true });
    renderWith({ activeFilePath: "c.md", processedFiles: [...files] });
    expect(selectedNames()).toEqual(["b", "c"]);
  });

  it("doesn't open a note on a modified click, even with singleClickOpen", () => {
    const { props } = renderFiles({ treeView: true, processedFiles: files, singleClickOpen: true });
    fireEvent.click(screen.getByText("b"), { metaKey: true });
    expect(props.openFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("b"));
    expect(props.openFile).toHaveBeenCalledWith(files[1].handle, "b.md");
  });

  it("moves the selection with the arrow keys and opens with Enter", () => {
    const { props } = renderFiles({ treeView: true, processedFiles: files });
    const tree = screen.getByRole("tree");

    fireEvent.keyDown(tree, { key: "ArrowDown" });
    expect(selectedNames()).toEqual(["a"]);
    fireEvent.keyDown(tree, { key: "ArrowDown" });
    fireEvent.keyDown(tree, { key: "ArrowDown", shiftKey: true });
    expect(selectedNames()).toEqual(["b", "c"]);
    fireEvent.keyDown(tree, { key: "ArrowUp" });
    expect(selectedNames()).toEqual(["b"]);

    fireEvent.keyDown(tree, { key: "Enter" });
    expect(props.openFile).toHaveBeenCalledWith(files[1].handle, "b.md");
  });

  it("opens and closes folders with the right and left arrow keys", () => {
    renderFiles({
      treeView: true,
      folderPaths: ["Folder"],
      processedFiles: [{ name: "nested.md", path: "Folder/nested.md", handle: { kind: "file", name: "nested.md" } }],
    });
    const tree = screen.getByRole("tree");

    fireEvent.keyDown(tree, { key: "ArrowDown" });
    fireEvent.keyDown(tree, { key: "ArrowRight" });
    expect(screen.getByText("nested")).toBeInTheDocument();
    fireEvent.keyDown(tree, { key: "ArrowRight" });
    expect(selectedNames()).toEqual(["nested"]);
    fireEvent.keyDown(tree, { key: "ArrowLeft" });
    expect(selectedNames()).toEqual(["Folder"]);
    fireEvent.keyDown(tree, { key: "ArrowLeft" });
    expect(screen.queryByText("nested")).not.toBeInTheDocument();
  });

  it("renames the focused row in place with F2", () => {
    renderFiles({ treeView: true, processedFiles: files });
    const tree = screen.getByRole("tree");
    fireEvent.keyDown(tree, { key: "ArrowDown" });
    fireEvent.keyDown(tree, { key: "F2" });
    expect((screen.getByLabelText("Note name") as HTMLInputElement).value).toBe("a");
  });

  it("moves the selection to the Trash with Delete, as one action", async () => {
    const trashItems = vi.fn();
    renderFiles({ treeView: true, processedFiles: files, trashItems });

    fireEvent.click(screen.getByText("a"));
    fireEvent.click(screen.getByText("b"), { ctrlKey: true });
    fireEvent.keyDown(screen.getByRole("tree"), { key: "Delete" });

    await waitFor(() => expect(trashItems).toHaveBeenCalledWith([
      { handle: files[0].handle, path: "a.md" },
      { handle: files[1].handle, path: "b.md" },
    ]));
  });

  it("undoes with Ctrl/⌘+Z and selects everything with Ctrl/⌘+A", () => {
    const undoFileOperation = vi.fn();
    renderFiles({ treeView: true, processedFiles: files, undoFileOperation });
    const tree = screen.getByRole("tree");

    fireEvent.keyDown(tree, { key: "z", ctrlKey: true });
    expect(undoFileOperation).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(tree, { key: "a", ctrlKey: true });
    expect(selectedNames()).toEqual(["a", "b", "c"]);
    fireEvent.keyDown(tree, { key: "Escape" });
    expect(selectedNames()).toEqual([]);
  });

  it("opens the menu on right-click, for the whole selection when the row is in it", async () => {
    const trashItems = vi.fn();
    renderFiles({ treeView: true, processedFiles: files, trashItems });

    fireEvent.contextMenu(screen.getByText("c"));
    expect(selectedNames()).toEqual(["c"]);
    expect(screen.getByRole("menuitem", { name: /Move to Trash/ })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    fireEvent.click(screen.getByText("a"));
    fireEvent.click(screen.getByText("b"), { shiftKey: true });
    fireEvent.contextMenu(screen.getByText("b"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Move 2 Items to Trash/ }));
    await waitFor(() => expect(trashItems).toHaveBeenCalledTimes(1));
    expect(trashItems.mock.calls[0][0].map((item: any) => item.path)).toEqual(["a.md", "b.md"]);
  });

  it("offers New Note and New Folder when right-clicking empty space", () => {
    renderFiles({ treeView: true, processedFiles: files, createNewFile: vi.fn(), createFolder: vi.fn() });
    fireEvent.contextMenu(screen.getByRole("tree"));
    fireEvent.click(screen.getByRole("menuitem", { name: "New Folder" }));
    expect(screen.getByLabelText("New folder name")).toBeInTheDocument();
  });

  it("lets its host start naming a new item in the selected folder", async () => {
    const folderHandle = { kind: "directory", name: "Folder" };
    const resolveFolderHandle = vi.fn().mockResolvedValue(folderHandle);
    const createNewFile = vi.fn();
    const controllerRef = { current: null } as React.MutableRefObject<any>;
    renderFiles({ treeView: true, folderPaths: ["Folder"], processedFiles: [], resolveFolderHandle, createNewFile, controllerRef });

    fireEvent.click(screen.getByText("Folder"));
    act(() => controllerRef.current.startCreate("file"));
    const field = screen.getByLabelText("New note name");
    fireEvent.change(field, { target: { value: "Ideas" } });
    fireEvent.keyDown(field, { key: "Enter" });

    await waitFor(() => expect(createNewFile).toHaveBeenCalledWith(folderHandle, "Ideas"));
  });

  it("drags the whole selection into a folder as one move", async () => {
    const folderHandle = { kind: "directory", name: "Folder" };
    const resolveFolderHandle = vi.fn().mockResolvedValue(folderHandle);
    const moveItems = vi.fn();
    renderFiles({ treeView: true, folderPaths: ["Folder"], processedFiles: files, resolveFolderHandle, moveItems });

    fireEvent.click(screen.getByText("a"));
    fireEvent.click(screen.getByText("b"), { ctrlKey: true });
    const source = screen.getByText("b").closest("[draggable]")!;
    const target = screen.getByText("Folder").closest("[draggable]")!;
    fireEvent.dragStart(source, { dataTransfer: { effectAllowed: "", dropEffect: "" } });
    fireEvent.dragOver(target, { dataTransfer: { effectAllowed: "", dropEffect: "" } });
    fireEvent.drop(target, { dataTransfer: { effectAllowed: "", dropEffect: "" } });

    await waitFor(() => expect(moveItems).toHaveBeenCalledWith([files[0].handle, files[1].handle], folderHandle));
  });
});
