import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import VaultSidebar from "./VaultSidebar";
import "@testing-library/jest-dom";

// Mock jotai
vi.mock("jotai", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAtomValue: vi.fn(),
    useAtom: vi.fn(),
  };
});

// Mock atoms
vi.mock("@/app/atoms/atoms", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    atom_activeFilePath: { toString: () => "atom_activeFilePath", read: () => {} },
    atom_sidebarWidth: { toString: () => "atom_sidebarWidth", read: () => {} },
  };
});

vi.mock("@/app/atoms/metadata", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    atom_fileMetadata: { toString: () => "atom_fileMetadata", read: () => {} },
    atom_customWorkspaces: { toString: () => "atom_customWorkspaces", read: () => {} },
  };
});

// Mock useFileSystem hook
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

import { useFileSystem } from "@/app/hooks/use-file-system";
import { useAtomValue, useAtom } from "jotai";

describe("VaultSidebar Component", () => {
  const mockOnClose = vi.fn();
  let mockFileSystem: any;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();

    const mockVaultHandle = {
      name: "My Vault",
      kind: "directory",
    };

    mockFileSystem = {
      openFile: vi.fn(),
      createNewFile: vi.fn(),
      vaultHandle: mockVaultHandle,
      currentDirectoryHandle: mockVaultHandle,
      activeFileHandle: null,
      deleteFile: vi.fn(),
      renameFile: vi.fn(),
      moveItem: vi.fn(),
      isVaultPending: false,
      restoreVault: vi.fn(),
      isVaultSupported: true,
      isMounted: true,
    };

    (useFileSystem as any).mockReturnValue(mockFileSystem);

    (useAtomValue as any).mockImplementation((atom: any) => {
      const str = atom.toString();
      if (str === "atom_fileMetadata") {
        return {
          "test.md": {
            tags: ["work"],
            handle: { name: "test.md", kind: "file" },
            path: "test.md",
            name: "test.md",
          },
        };
      }
      if (str === "atom_indexerState") return "idle";
      return {};
    });

    (useAtom as any).mockImplementation((atom: any) => {
      const atomStr = atom.toString();
      if (atomStr === "atom_activeFilePath") return ["test.md", vi.fn()];
      if (atomStr === "atom_sidebarWidth") return [260, vi.fn()];
      if (atomStr === "atom_fileMetadata") {
        return [
          {
            "test.md": {
              tags: ["work"],
              handle: { name: "test.md", kind: "file" },
              path: "test.md",
              name: "test.md",
            },
          },
          vi.fn(),
        ];
      }
      if (atomStr === "atom_customWorkspaces") return [[], vi.fn()];
      return [null, vi.fn()];
    });
  });

  it("renders vault name", () => {
    render(<VaultSidebar onClose={mockOnClose} />);
    expect(screen.getByText("My Vault")).toBeInTheDocument();
  });

  it("renders file without .md extension", async () => {
    render(<VaultSidebar onClose={mockOnClose} />);
    expect(await screen.findByText("test")).toBeInTheDocument();
  });

  it("calls openFile when a file is clicked", async () => {
    render(<VaultSidebar onClose={mockOnClose} />);
    const file = await screen.findByText("test");
    fireEvent.click(file);
    expect(mockFileSystem.openFile).toHaveBeenCalled();
  });

  it("shows tag suggestion #work when typing # in search", () => {
    render(<VaultSidebar onClose={mockOnClose} />);
    const searchInput = screen.getByPlaceholderText("Search files or #tags...");
    fireEvent.change(searchInput, { target: { value: "#" } });
    expect(screen.getByText("#work")).toBeInTheDocument();
  });

  it("filters files by search query", async () => {
    (useAtomValue as any).mockImplementation((atom: any) => {
      const str = atom.toString();
      if (str === "atom_fileMetadata") {
        return {
          "test.md": {
            tags: [], handle: { name: "test.md", kind: "file" }, path: "test.md", name: "test.md",
          },
          "alpha.md": {
            tags: [], handle: { name: "alpha.md", kind: "file" }, path: "alpha.md", name: "alpha.md",
          },
        };
      }
      if (str === "atom_indexerState") return "idle";
      return {};
    });

    render(<VaultSidebar onClose={mockOnClose} />);

    const searchInput = screen.getByPlaceholderText("Search files or #tags...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    expect(await screen.findByText("test")).toBeInTheDocument();
    expect(screen.queryByText("alpha")).not.toBeInTheDocument();
  });

  it("shows multiple tag suggestions when typing # with many tags", () => {
    const manyTags: Record<string, any> = {};
    for (let i = 0; i < 6; i++) {
      manyTags[`file_tag${i}.md`] = {
        tags: [`tag${i}`],
        handle: { name: `file_tag${i}.md`, kind: "file" },
        path: `file_tag${i}.md`,
        name: `file_tag${i}.md`,
      };
    }

    (useAtomValue as any).mockImplementation((atom: any) => {
      if (atom.toString() === "atom_fileMetadata") return manyTags;
      if (atom.toString() === "atom_indexerState") return "idle";
      return {};
    });

    render(<VaultSidebar onClose={mockOnClose} />);
    const searchInput = screen.getByPlaceholderText("Search files or #tags...");
    fireEvent.change(searchInput, { target: { value: "#" } });

    expect(screen.getByText("#tag0")).toBeInTheDocument();
    expect(screen.getByText("#tag1")).toBeInTheDocument();
  });

  it("renders files from a subfolder with path hint", async () => {
    (useAtomValue as any).mockImplementation((atom: any) => {
      if (atom.toString() === "atom_fileMetadata") {
        return {
          "subfolder/nested.md": {
            tags: [],
            handle: { name: "nested.md", kind: "file" },
            path: "subfolder/nested.md",
            name: "nested.md",
          },
        };
      }
      if (atom.toString() === "atom_indexerState") return "idle";
      return {};
    });

    render(<VaultSidebar onClose={mockOnClose} />);
    expect(await screen.findByText("nested")).toBeInTheDocument();
  });

  it("performs recursive search across subfolders", async () => {
    (useAtomValue as any).mockImplementation((atom: any) => {
      if (atom.toString() === "atom_fileMetadata") {
        return {
          "folder/nested.md": {
            tags: [], handle: { name: "nested.md", kind: "file" }, path: "folder/nested.md", name: "nested.md",
          },
          "root-file.md": {
            tags: [], handle: { name: "root-file.md", kind: "file" }, path: "root-file.md", name: "root-file.md",
          },
        };
      }
      if (atom.toString() === "atom_indexerState") return "idle";
      return {};
    });

    render(<VaultSidebar onClose={mockOnClose} />);

    const searchInput = screen.getByPlaceholderText("Search files or #tags...");
    fireEvent.change(searchInput, { target: { value: "nested" } });

    expect(await screen.findByText("nested")).toBeInTheDocument();
  });
});
