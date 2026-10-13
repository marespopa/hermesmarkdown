import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { Provider } from "jotai";
import FilesPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/app/hooks/use-vault-sync", () => ({ useVaultSync: vi.fn() }));

const fileSystem = vi.hoisted(() => ({
  isMounted: true,
  vaultHandle: { name: "Notes" } as unknown,
  createNewFile: vi.fn(),
  createFolder: vi.fn(),
  deleteFile: vi.fn(),
  trashItems: vi.fn(),
  duplicateFile: vi.fn(),
  moveItem: vi.fn(),
  moveItems: vi.fn(),
  undoFileOperation: vi.fn(),
  openFile: vi.fn(),
  renameFile: vi.fn(),
}));
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => fileSystem }));
vi.mock("../hooks/useVaultFileSearch", () => ({
  useVaultFileSearch: () => ({
    allFiles: [], folderPaths: [], processedFiles: [], totalResultsCount: 0, hasMoreResults: false,
    searchQuery: "", setSearchQuery: vi.fn(), setShowAllResults: vi.fn(), tags: [],
  }),
}));
const treeProps = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));
vi.mock("../components/VaultFileTree", () => ({
  default: (props: Record<string, unknown>) => {
    treeProps.current = props;
    return <div data-testid="file-tree" />;
  },
}));
vi.mock("../components/UnifiedSearchInput", () => ({ default: () => <input aria-label="Search" /> }));

describe("FilesPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("has the shared create actions and no Refresh button", () => {
    render(<Provider><FilesPage /></Provider>);
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Note" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Folder" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New Note from Template…" })).not.toBeInTheDocument();
  });
});
