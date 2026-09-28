import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SmartFolders from "./SmartFolders";
import "@testing-library/jest-dom";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { atom_customWorkspaces, atom_fileMetadata } from "@/app/atoms/metadata";

describe("SmartFolders Component", () => {
  const mockOnFileSelect = vi.fn();
  const mockRenameFile = vi.fn();
  const mockDeleteFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  let mockMetadata: any = null;

  function Hydrate({ children }: { children: React.ReactNode }) {
    useHydrateAtoms([
      [atom_fileMetadata, mockMetadata || {}],
      [atom_customWorkspaces, []],
    ]);
    return children;
  }

  const renderSmartFolders = () => render(
    <Provider>
      <Hydrate>
        <SmartFolders
          onFileSelect={mockOnFileSelect}
          renameFile={mockRenameFile}
          deleteFile={mockDeleteFile}
        />
      </Hydrate>
    </Provider>,
  );

  it("renders default workspace names", () => {
    mockMetadata = {};
    renderSmartFolders();

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

    renderSmartFolders();

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

    renderSmartFolders();

    fireEvent.click(screen.getByText("Today's Work"));

    // Open action menu
    const actionButton = screen.getByTitle("File options");
    fireEvent.click(actionButton);

    // Click Delete
    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    expect(mockDeleteFile).toHaveBeenCalledWith(mockMetadata["file1.md"].handle, "file1.md");
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

    renderSmartFolders();

    fireEvent.click(screen.getByText("Today's Work"));

    // Open action menu
    const actionButton = screen.getByTitle("File options");
    fireEvent.click(actionButton);

    // Click Rename
    const renameButton = screen.getByText("Rename");
    fireEvent.click(renameButton);

    expect(mockRenameFile).toHaveBeenCalledWith(mockMetadata["file1.md"].handle, undefined, "file1.md");
  });

  it("renders a New View affordance at the bottom of the list", () => {
    mockMetadata = {};
    renderSmartFolders();

    expect(screen.getByText("New View")).toBeInTheDocument();
  });
});
