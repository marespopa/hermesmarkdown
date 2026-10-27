import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { Provider } from "jotai";
import FilesPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/editor" }));

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
const search = vi.hoisted(() => ({
  allFiles: [] as unknown[], folderPaths: [] as string[], processedFiles: [] as unknown[], totalResultsCount: 0, searchQuery: "",
}));
vi.mock("../hooks/useVaultFileSearch", () => ({
  useVaultFileSearch: () => ({
    ...search, hasMoreResults: false,
    setSearchQuery: vi.fn(), setShowAllResults: vi.fn(), tags: [],
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
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(search, { allFiles: [], folderPaths: [], processedFiles: [], totalResultsCount: 0, searchQuery: "" });
  });

  it("formats the summary with separators and singular units", () => {
    search.allFiles = Array.from({ length: 1204 }, (_, i) => ({ path: `n${i}.md`, name: `n${i}.md` }));
    search.folderPaths = ["Projects"];
    render(<Provider><FilesPage /></Provider>);
    expect(screen.getByText("1,204 notes, 1 folder")).toBeInTheDocument();
  });

  it("reads 1 matching file when filtered to one", () => {
    search.searchQuery = "road";
    search.totalResultsCount = 1;
    search.processedFiles = [{ path: "a.md", name: "a.md" }];
    render(<Provider><FilesPage /></Provider>);
    expect(screen.getByText("1 matching file")).toBeInTheDocument();
  });

  it("has the shared create actions and no Refresh button", () => {
    render(<Provider><FilesPage /></Provider>);
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New File" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Folder" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New Note from Template…" })).not.toBeInTheDocument();
  });
});
