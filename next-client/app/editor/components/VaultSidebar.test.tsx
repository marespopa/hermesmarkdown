import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
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

vi.mock("@/app/hooks/use-dialog", () => ({ useDialog: vi.fn() }));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

import { useFileSystem } from "@/app/hooks/use-file-system";
import { useDialog } from "@/app/hooks/use-dialog";
import { useAtomValue, useAtom } from "jotai";
import { atom_userName } from "@/app/atoms/ui-atoms";
import { atom_vaultFiles } from "@/app/atoms/vault-atoms";

describe("VaultSidebar Component", () => {
  const mockOnClose = vi.fn();
  let mockFileSystem: any;
  let mockVaultFiles: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockVaultFiles = [];
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
      scanVault: vi.fn(),
    };

    (useFileSystem as any).mockReturnValue(mockFileSystem);
    (useDialog as any).mockReturnValue({ prompt: vi.fn() });

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

  it("renders the note and folder metrics in the footer", () => {
    render(<VaultSidebar panel="search" onClose={mockOnClose} />);
    expect(screen.getByLabelText("Vault metrics")).toHaveTextContent("1 note, 0 folders");
  });

  it("provides a vault reveal utility in the footer", () => {
    render(<VaultSidebar panel="search" onClose={mockOnClose} />);
    expect(screen.getByRole("button", { name: "Reveal vault in file picker" })).toBeInTheDocument();
  });

  it("keeps the header limited to vault controls and puts new note in the footer", () => {
    const onNewFile = vi.fn();
    render(<VaultSidebar panel="files" onClose={mockOnClose} onNewFile={onNewFile} />);
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("button", { name: "Switch vault" })).toBeInTheDocument();
    expect(within(header).queryByRole("button", { name: "Tasks" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open command palette" })).toBeInTheDocument();
    expect(screen.queryByText("Root")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New note" }));
    expect(onNewFile).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "New folder" })).toBeInTheDocument();
  });

  it("creates a root folder from the footer", async () => {
    const prompt = vi.fn().mockResolvedValue("Projects");
    (useDialog as any).mockReturnValue({ prompt });
    render(<VaultSidebar panel="files" onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole("button", { name: "New folder" }));

    await waitFor(() => {
      expect(prompt).toHaveBeenCalledWith("Enter folder name:", "", "New Folder");
      expect(mockFileSystem.vaultHandle.getDirectoryHandle).toHaveBeenCalledWith("Projects", { create: true });
      expect(mockFileSystem.scanVault).toHaveBeenCalledWith(mockFileSystem.vaultHandle);
    });
  });

  it("does not add a greeting to the minimal header", () => {
    render(<VaultSidebar panel="files" onClose={mockOnClose} />);
    expect(screen.queryByText("Welcome back, Ada")).not.toBeInTheDocument();
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

});
