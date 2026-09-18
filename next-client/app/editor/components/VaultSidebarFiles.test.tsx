import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VaultSidebarFiles from "./VaultSidebarFiles";

vi.mock("jotai", async (importOriginal) => ({
  ...await importOriginal<typeof import("jotai")>(),
  useAtomValue: vi.fn(() => "idle"),
}));

const fileHandle = { kind: "file", name: "note.md" } as FileSystemFileHandle;

function renderFiles(overrides: Partial<React.ComponentProps<typeof VaultSidebarFiles>> = {}) {
  const props: React.ComponentProps<typeof VaultSidebarFiles> = {
    processedFiles: [{ name: "note.md", path: "note.md", handle: fileHandle }],
    activeFilePath: null,
    openFile: vi.fn(),
    renameFile: vi.fn(),
    deleteFile: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<VaultSidebarFiles {...props} />) };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("VaultSidebarFiles tree interactions", () => {
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

  it("renames files inline while selecting only the Markdown basename", async () => {
    const { props } = renderFiles();

    fireEvent.click(screen.getByLabelText("File options"));
    fireEvent.click(screen.getByText("Rename"));

    const input = screen.getByLabelText("Rename note.md") as HTMLInputElement;
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(4);

    fireEvent.change(input, { target: { value: "renamed.md" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(props.renameFile).toHaveBeenCalledWith(fileHandle, "renamed.md");
    expect(screen.queryByLabelText("Rename note.md")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByText("note").closest("[tabindex]"));
    });
  });

  it("renames folders inline with a freshly resolved handle", async () => {
    const folderHandle = { kind: "directory", name: "Folder" };
    const resolveFolderHandle = vi.fn().mockResolvedValue(folderHandle);
    const { props } = renderFiles({
      treeView: true,
      folderPaths: ["Folder"],
      resolveFolderHandle,
    });

    fireEvent.click(screen.getByLabelText("Folder options"));
    fireEvent.click(screen.getByText("Rename"));
    const input = screen.getByLabelText("Rename Folder");
    fireEvent.change(input, { target: { value: "Renamed folder" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(resolveFolderHandle).toHaveBeenCalledWith("Folder");
      expect(props.renameFile).toHaveBeenCalledWith(folderHandle, "Renamed folder");
    });
  });
});
