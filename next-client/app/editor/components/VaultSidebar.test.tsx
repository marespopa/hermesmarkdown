import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import VaultSidebar from "./VaultSidebar";
import "@testing-library/jest-dom";

const { mockFolderPrompt } = vi.hoisted(() => ({
  mockFolderPrompt: vi.fn(),
}));

// Mock jotai
vi.mock("jotai", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAtomValue: vi.fn(),
    useAtom: vi.fn(),
    useSetAtom: vi.fn(() => vi.fn()),
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

vi.mock("@/app/atoms/ui-atoms", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    atom_railPanel: { toString: () => "atom_railPanel", read: () => {} },
    atom_selectedFileTags: { toString: () => "atom_selectedFileTags", read: () => {} },
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

vi.mock("@/app/hooks/use-dialog", () => ({
  useDialog: vi.fn(() => ({
    prompt: mockFolderPrompt,
  })),
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
import { atom_userName } from "@/app/atoms/ui-atoms";
import { atom_vaultFiles } from "@/app/atoms/vault-atoms";
import { version } from "@/package.json";

describe("VaultSidebar Component", () => {
  const mockOnClose = vi.fn();
  let mockFileSystem: any;
  let mockVaultFiles: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockVaultFiles = [];
    mockFolderPrompt.mockResolvedValue("Projects");

    const mockVaultHandle = {
      name: "My Vault",
      kind: "directory",
      getDirectoryHandle: vi.fn(),
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
      closeVault: vi.fn(),
      scanVault: vi.fn(async () => {
        mockVaultFiles = [{ name: "Projects", kind: "directory", path: "Projects" }];
      }),
    };

    (useFileSystem as any).mockReturnValue(mockFileSystem);

    (useAtomValue as any).mockImplementation((atom: any) => {
      if (atom === atom_userName) return "Ada";
      if (atom === atom_vaultFiles) return mockVaultFiles;
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
      if (atomStr === "atom_selectedFileTags") return [[], vi.fn()];
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
    render(<VaultSidebar panel="search" onClose={mockOnClose} />);
    expect(screen.getByText("My Vault")).toBeInTheDocument();
  });

  it("renders the HermesMarkdown version in the footer", () => {
    render(<VaultSidebar panel="search" onClose={mockOnClose} />);
    expect(screen.getByText(`HermesMarkdown v${version}`)).toBeInTheDocument();
  });

  it("closes the vault from the footer", () => {
    render(<VaultSidebar panel="search" onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close Vault" }));
    expect(mockFileSystem.closeVault).toHaveBeenCalledOnce();
  });

  it("places the Tasks page control with the header utilities", () => {
    const onTasks = vi.fn();
    const onSettings = vi.fn();
    const onDocumentation = vi.fn();
    render(
      <VaultSidebar
        panel="files"
        onClose={mockOnClose}
        onTasks={onTasks}
        onSettings={onSettings}
        onDocumentation={onDocumentation}
      />,
    );

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("button", { name: "Settings" })).toHaveClass("h-9", "w-9");
    expect(within(header).getByRole("button", { name: "Documentation" })).toHaveClass("h-9", "w-9");
    expect(within(header).getByRole("button", { name: "Theme: System" })).toHaveClass("h-9", "w-9");
    fireEvent.click(within(header).getByRole("button", { name: "Tasks" }));

    expect(onTasks).toHaveBeenCalledOnce();
    expect(screen.queryByPlaceholderText("Filter tasks...")).not.toBeInTheDocument();
  });

  it("greets the user in the Files panel", () => {
    render(<VaultSidebar panel="files" onClose={mockOnClose} />);
    expect(screen.getByText("Welcome back, Ada")).toBeInTheDocument();
  });

  it("does not render an empty greeting", () => {
    (useAtomValue as any).mockImplementation((atom: any) => {
      if (atom === atom_userName) return "";
      if (atom === atom_vaultFiles) return [];
      if (atom.toString() === "atom_fileMetadata") return {};
      if (atom.toString() === "atom_indexerState") return "idle";
      return {};
    });

    render(<VaultSidebar panel="files" onClose={mockOnClose} />);
    expect(screen.queryByText(/Welcome back,/)).not.toBeInTheDocument();
  });

  it("renders file without .md extension", async () => {
    render(<VaultSidebar panel="search" onClose={mockOnClose} />);
    expect(await screen.findByText("test")).toBeInTheDocument();
  });

  it("calls openFile when a file is clicked", async () => {
    render(<VaultSidebar panel="search" onClose={mockOnClose} />);
    const file = await screen.findByText("test");
    fireEvent.click(file);
    expect(mockFileSystem.openFile).toHaveBeenCalled();
  });

  it("shows a newly created empty folder in the Files tree", async () => {
    render(<VaultSidebar panel="files" onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole("button", { name: "New Folder" }));

    await waitFor(() => {
      expect(mockFileSystem.vaultHandle.getDirectoryHandle).toHaveBeenCalledWith("Projects", { create: true });
      expect(mockFileSystem.scanVault).toHaveBeenCalledWith(mockFileSystem.vaultHandle);
    });

    render(<VaultSidebar panel="files" onClose={mockOnClose} />);
    expect(screen.getByText("Projects")).toBeInTheDocument();
  });

  it("shows tag suggestion #work when typing # in search", () => {
    render(<VaultSidebar panel="search" onClose={mockOnClose} />);
    const searchInput = screen.getByPlaceholderText("Search or #tag…");
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

    render(<VaultSidebar panel="search" onClose={mockOnClose} />);

    const searchInput = screen.getByPlaceholderText("Search or #tag…");
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
      const str = atom.toString();
      if (str === "atom_fileMetadata") return manyTags;
      if (str === "atom_indexerState") return "idle";
      return {};
    });

    render(<VaultSidebar panel="search" onClose={mockOnClose} />);
    const searchInput = screen.getByPlaceholderText("Search or #tag…");
    fireEvent.change(searchInput, { target: { value: "#" } });

    expect(screen.getByText("#tag0")).toBeInTheDocument();
    expect(screen.getByText("#tag1")).toBeInTheDocument();
  });

  it("renders files from a subfolder with path hint", async () => {
    (useAtomValue as any).mockImplementation((atom: any) => {
      const str = atom.toString();
      if (str === "atom_fileMetadata") {
        return {
          "subfolder/nested.md": {
            tags: [],
            handle: { name: "nested.md", kind: "file" },
            path: "subfolder/nested.md",
            name: "nested.md",
          },
        };
      }
      if (str === "atom_indexerState") return "idle";
      return {};
    });

    render(<VaultSidebar panel="search" onClose={mockOnClose} />);
    expect(await screen.findByText("nested")).toBeInTheDocument();
  });

  it("performs recursive search across subfolders", async () => {
    (useAtomValue as any).mockImplementation((atom: any) => {
      const str = atom.toString();
      if (str === "atom_fileMetadata") {
        return {
          "folder/nested.md": {
            tags: [], handle: { name: "nested.md", kind: "file" }, path: "folder/nested.md", name: "nested.md",
          },
          "root-file.md": {
            tags: [], handle: { name: "root-file.md", kind: "file" }, path: "root-file.md", name: "root-file.md",
          },
        };
      }
      if (str === "atom_indexerState") return "idle";
      return {};
    });

    render(<VaultSidebar panel="search" onClose={mockOnClose} />);

    const searchInput = screen.getByPlaceholderText("Search or #tag…");
    fireEvent.change(searchInput, { target: { value: "nested" } });

    expect(await screen.findByText("nested")).toBeInTheDocument();
  });
});
