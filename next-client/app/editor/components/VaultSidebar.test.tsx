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
  const mockFileSystem = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
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
});
