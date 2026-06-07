import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SmartFolders from "./SmartFolders";
import "@testing-library/jest-dom";

// Mock jotai's useAtom
vi.mock("jotai", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAtom: vi.fn(),
  };
});

// Mock atoms
vi.mock("@/app/atoms/metadata", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    atom_fileMetadata: { toString: () => "atom_fileMetadata" },
  };
});

import { useAtom } from "jotai";

describe("SmartFolders Component", () => {
  const mockOnFileSelect = vi.fn();
  const mockRenameFile = vi.fn();
  const mockDeleteFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    (useAtom as any).mockImplementation((atom: any) => {
      const atomStr = atom.toString();
      if (atomStr === "atom_fileMetadata") {
        return [mockMetadata || {}, vi.fn()];
      }
      if (atomStr === "atom_customWorkspaces") {
        return [[], vi.fn()];
      }
      return [[], vi.fn()];
    });
  });

  let mockMetadata: any = null;

  it("renders default workspace names", () => {
    mockMetadata = {};
    render(
      <SmartFolders
        onFileSelect={mockOnFileSelect}
        renameFile={mockRenameFile}
        deleteFile={mockDeleteFile}
      />,
    );

    expect(screen.getByText("Today's Work")).toBeInTheDocument();
  });

  it("expands a folder and shows matching files", () => {
    mockMetadata = {
      "file1.md": {
        path: "file1.md",
        name: "file1.md",
        tags: ["#todo"],
        links: [],
        frontmatter: {},
        modifiedAt: Date.now(),
        wordCount: 10,
        handle: { name: "file1.md", kind: "file" } as any,
      },
    };

    render(
      <SmartFolders
        onFileSelect={mockOnFileSelect}
        renameFile={mockRenameFile}
        deleteFile={mockDeleteFile}
      />,
    );

    // Click "Today's Work"
    const folder = screen.getByText("Today's Work");
    fireEvent.click(folder);

    expect(screen.getByText("file1.md")).toBeInTheDocument();
  });

  it("calls deleteFile when delete is clicked in file action menu", () => {
    mockMetadata = {
      "file1.md": {
        path: "file1.md",
        name: "file1.md",
        tags: ["#todo"],
        links: [],
        frontmatter: {},
        modifiedAt: Date.now(),
        wordCount: 10,
        handle: { name: "file1.md", kind: "file" } as any,
      },
    };

    render(
      <SmartFolders
        onFileSelect={mockOnFileSelect}
        renameFile={mockRenameFile}
        deleteFile={mockDeleteFile}
      />,
    );

    fireEvent.click(screen.getByText("Today's Work"));

    // Open action menu
    const actionButton = screen.getByTitle("File options");
    fireEvent.click(actionButton);

    // Click Delete
    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    expect(mockDeleteFile).toHaveBeenCalledWith(mockMetadata["file1.md"].handle);
  });

  it("calls renameFile when rename is clicked in file action menu", () => {
    mockMetadata = {
      "file1.md": {
        path: "file1.md",
        name: "file1.md",
        tags: ["#todo"],
        links: [],
        frontmatter: {},
        modifiedAt: Date.now(),
        wordCount: 10,
        handle: { name: "file1.md", kind: "file" } as any,
      },
    };

    render(
      <SmartFolders
        onFileSelect={mockOnFileSelect}
        renameFile={mockRenameFile}
        deleteFile={mockDeleteFile}
      />,
    );

    fireEvent.click(screen.getByText("Today's Work"));

    // Open action menu
    const actionButton = screen.getByTitle("File options");
    fireEvent.click(actionButton);

    // Click Rename
    const renameButton = screen.getByText("Rename");
    fireEvent.click(renameButton);

    expect(mockRenameFile).toHaveBeenCalledWith(mockMetadata["file1.md"].handle);
  });

  it("filters files by searchQuery", () => {
    mockMetadata = {
      "apple.md": {
        path: "apple.md",
        name: "apple.md",
        tags: [],
        links: [],
        frontmatter: {},
        modifiedAt: Date.now(),
        wordCount: 10,
        handle: { name: "apple.md", kind: "file" } as any,
      },
      "banana.md": {
        path: "banana.md",
        name: "banana.md",
        tags: [],
        links: [],
        frontmatter: {},
        modifiedAt: Date.now(),
        wordCount: 10,
        handle: { name: "banana.md", kind: "file" } as any,
      },
    };

    render(
      <SmartFolders
        onFileSelect={mockOnFileSelect}
        renameFile={mockRenameFile}
        deleteFile={mockDeleteFile}
        searchQuery="apple"
      />,
    );

    fireEvent.click(screen.getByText("Today's Work"));

    expect(screen.getByText("apple.md")).toBeInTheDocument();
    expect(screen.queryByText("banana.md")).not.toBeInTheDocument();
  });
});
