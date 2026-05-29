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
  };
});

// Mock useFileSystem hook
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: vi.fn(),
}));

import { useFileSystem } from "@/app/hooks/use-file-system";
import { useAtomValue } from "jotai";

describe("VaultSidebar Component", () => {
  const mockOnClose = vi.fn();
  const mockFileSystem = {
    vaultFiles: [
      { name: "test.md", kind: "file" },
      { name: "folder", kind: "directory" },
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    (useFileSystem as any).mockReturnValue(mockFileSystem);
    (useAtomValue as any).mockReturnValue({
      "test.md": {
        tags: ["#work"],
        handle: { name: "test.md", kind: "file" },
        path: "test.md",
      },
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
