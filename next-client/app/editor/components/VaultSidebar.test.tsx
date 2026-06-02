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

    mockFileSystem = {
      vaultFiles: [
        { name: "test.md", kind: "file", handle: { name: "test.md" } },
        { name: "folder", kind: "directory", handle: { name: "folder" } },
      ],
      openFile: vi.fn(),
      createNewFile: vi.fn(),
      createNewFolder: vi.fn(),
      vaultHandle: { name: "My Vault" },
      currentDirectoryHandle: { name: "My Vault" },
      activeFileHandle: null,
      navigateTo: vi.fn(),
      navigateBack: vi.fn(),
      deleteFile: vi.fn(),
      renameFile: vi.fn(),
      vaultTags: { "#work": [] },
      isVaultPending: false,
      restoreVault: vi.fn(),
      isVaultSupported: true,
      isMounted: true,
    };

    (useFileSystem as any).mockReturnValue(mockFileSystem);
    
    (useAtomValue as any).mockImplementation((atom: any) => {
      if (atom.toString() === "atom_fileMetadata") {
        return {
          "test.md": {
            tags: ["#work"],
            handle: { name: "test.md", kind: "file" },
            path: "test.md",
            name: "test.md",
          },
        };
      }
      return {};
    });

    (useAtom as any).mockImplementation((atom: any) => {
      const atomStr = atom.toString();
      if (atomStr === "atom_activeFilePath") {
        return ["test.md", vi.fn()];
      }
      if (atomStr === "atom_sidebarWidth") {
        return [260, vi.fn()];
      }
      if (atomStr === "atom_fileMetadata") {
        return [
          {
            "test.md": {
              tags: ["#work"],
              handle: { name: "test.md", kind: "file" },
              path: "test.md",
              name: "test.md",
            },
          },
          vi.fn(),
        ];
      }
      if (atomStr === "atom_customWorkspaces") {
        return [[], vi.fn()];
      }
      return [null, vi.fn()];
    });
  });

  it("renders vault name and files", () => {
    render(<VaultSidebar onClose={mockOnClose} />);

    expect(screen.getByText("My Vault")).toBeInTheDocument();
    expect(screen.getByText("test.md")).toBeInTheDocument();
    expect(screen.getByText("folder")).toBeInTheDocument();
  });

  it("calls openFile when a file is clicked", () => {
    render(<VaultSidebar onClose={mockOnClose} />);

    fireEvent.click(screen.getByText("test.md"));
    expect(mockFileSystem.openFile).toHaveBeenCalled();
  });

  it("calls navigateTo when a folder is clicked", () => {
    render(<VaultSidebar onClose={mockOnClose} />);

    fireEvent.click(screen.getByText("folder"));
    expect(mockFileSystem.navigateTo).toHaveBeenCalled();
  });

  it("shows tag filters", () => {
    render(<VaultSidebar onClose={mockOnClose} />);
    expect(screen.getByText("#work")).toBeInTheDocument();
  });

  it("sorts folders before files", () => {
    mockFileSystem.vaultFiles = [
      { name: "z-file.md", kind: "file", handle: { name: "z-file.md" } },
      { name: "a-folder", kind: "directory", handle: { name: "a-folder" } },
      { name: "a-file.md", kind: "file", handle: { name: "a-file.md" } },
    ];
    render(<VaultSidebar onClose={mockOnClose} />);

    const entries = screen.getAllByText(/folder|file/);
    // Use findIndex or similar to check relative order in the DOM
    const texts = entries.map(el => el.textContent);
    expect(texts[0]).toBe("a-folder");
    expect(texts[1]).toBe("a-file.md");
    expect(texts[2]).toBe("z-file.md");
  });

  it("filters files by search query", () => {
    // Search should always be visible when expanded
    render(<VaultSidebar onClose={mockOnClose} />);
    expect(screen.getByPlaceholderText("Search files...")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Search files...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    expect(screen.getByText("test.md")).toBeInTheDocument();
    expect(screen.queryByText("folder")).not.toBeInTheDocument();
  });

  it("shows tag search only when more than 5 tags", () => {
    // Current mock has 1 tag, so search should be hidden
    render(<VaultSidebar onClose={mockOnClose} />);
    expect(screen.queryByPlaceholderText("Search filters...")).not.toBeInTheDocument();

    cleanup();

    // Mock many tags
    const manyTags: Record<string, any[]> = {};
    for (let i = 0; i < 6; i++) {
      manyTags[`#tag${i}`] = [];
    }
    
    (useAtomValue as any).mockImplementation((atom: any) => {
      if (atom.toString() === "atom_fileMetadata") {
        const metadata: any = {};
        Object.keys(manyTags).forEach(tag => {
          metadata[`file_${tag}.md`] = {
            tags: [tag],
            handle: { name: `file_${tag}.md`, kind: "file" },
            path: `file_${tag}.md`,
            name: `file_${tag}.md`,
          };
        });
        return metadata;
      }
      return {};
    });

    render(<VaultSidebar onClose={mockOnClose} />);
    expect(screen.getByPlaceholderText("Search filters...")).toBeInTheDocument();

    // Test tag filtering
    const searchInput = screen.getByPlaceholderText("Search filters...");
    fireEvent.change(searchInput, { target: { value: "tag0" } });
    expect(screen.getByText("#tag0")).toBeInTheDocument();
    expect(screen.queryByText("#tag1")).not.toBeInTheDocument();
  });

  it("filters files by search query when in a subfolder", () => {
    mockFileSystem.currentDirectoryHandle = { name: "subfolder" };
    // In our new implementation, file search is global and uses metadata
    (useAtomValue as any).mockImplementation((atom: any) => {
      if (atom.toString() === "atom_fileMetadata") {
        return {
          "subfolder/nested.md": {
            name: "nested.md",
            path: "subfolder/nested.md",
            handle: { name: "nested.md", kind: "file" },
            tags: []
          },
          "subfolder/other.md": {
            name: "other.md",
            path: "subfolder/other.md",
            handle: { name: "other.md", kind: "file" },
            tags: []
          }
        };
      }
      return {};
    });
    
    render(<VaultSidebar onClose={mockOnClose} />);

    const searchInput = screen.getByPlaceholderText("Search files...");
    fireEvent.change(searchInput, { target: { value: "nested" } });

    expect(screen.getByText("nested.md")).toBeInTheDocument();
    expect(screen.queryByText("other.md")).not.toBeInTheDocument();
  });

  it("performs recursive global search when searching from root", () => {
    // Mock files in metadata (global index)
    (useAtomValue as any).mockImplementation((atom: any) => {
      if (atom.toString() === "atom_fileMetadata") {
        return {
          "folder/nested.md": {
            name: "nested.md",
            path: "folder/nested.md",
            handle: { name: "nested.md", kind: "file" },
            tags: []
          },
          "root-file.md": {
            name: "root-file.md",
            path: "root-file.md",
            handle: { name: "root-file.md", kind: "file" },
            tags: []
          }
        };
      }
      return {};
    });

    render(<VaultSidebar onClose={mockOnClose} />);

    const searchInput = screen.getByPlaceholderText("Search files...");
    fireEvent.change(searchInput, { target: { value: "nested" } });

    expect(screen.getByText("nested.md")).toBeInTheDocument();
  });
});
