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

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom.toString() === "atom_fileMetadata") {
        return [mockMetadata || {}, vi.fn()];
      }
      return [[], vi.fn()];
    });
  });

  let mockMetadata: any = null;

  it("renders default workspace names", () => {
    mockMetadata = {};
    render(<SmartFolders onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText("Today's Work")).toBeInTheDocument();
    expect(screen.queryByText("Review Pending")).not.toBeInTheDocument();
    expect(screen.queryByText("Stale Logs")).not.toBeInTheDocument();
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

    render(<SmartFolders onFileSelect={mockOnFileSelect} />);

    // Click "Today's Work"
    const folder = screen.getByText("Today's Work");
    fireEvent.click(folder);

    expect(screen.getByText("file1.md")).toBeInTheDocument();
  });

  it("calls onFileSelect when a file is clicked", () => {
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

    render(<SmartFolders onFileSelect={mockOnFileSelect} />);

    fireEvent.click(screen.getByText("Today's Work"));
    fireEvent.click(screen.getByText("file1.md"));

    expect(mockOnFileSelect).toHaveBeenCalledWith(
      mockMetadata["file1.md"].handle,
      mockMetadata["file1.md"].path,
    );
  });
});
