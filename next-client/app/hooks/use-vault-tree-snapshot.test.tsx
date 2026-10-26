import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_vaultTreeListedKey, atom_vaultTreeSnapshot } from "@/app/atoms/tree-snapshot-atoms";
import { atom_openingFilePath } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { showErrorToast } from "@/app/components/Toastr";
import { useVaultFileSearch } from "@/app/editor/hooks/useVaultFileSearch";
import { useOpenSnapshotRow } from "./use-vault-tree-snapshot";

vi.mock("@/app/components/Toastr", () => ({ showErrorToast: vi.fn() }));

const VAULT_KEY = "local:Vault";
const fileHandle = { kind: "file", name: "found.md" } as unknown as FileSystemFileHandle;

function meta(path: string): FileMetadata {
  return { path, name: path.split("/").pop()!, tags: [], links: [], frontmatter: {}, modifiedAt: 0, wordCount: 0, tasks: [], handle: fileHandle };
}

function vault(files: Record<string, FileSystemFileHandle>) {
  const notFound = () => Promise.reject(Object.assign(new Error("gone"), { name: "NotFoundError" }));
  return {
    name: "Vault",
    getDirectoryHandle: notFound,
    getFileHandle: (name: string) => (files[name] ? Promise.resolve(files[name]) : notFound()),
  } as unknown as FileSystemDirectoryHandle;
}

let store: ReturnType<typeof createStore>;
const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;

beforeEach(() => {
  vi.clearAllMocks();
  store = createStore();
  store.set(atom_vaultHandle, vault({}));
  store.set(atom_fileMetadata, { "found.md": meta("found.md") });
  store.set(atom_vaultTreeSnapshot, { vaultKey: VAULT_KEY, files: ["found.md", "later.md", "Projects/plan.md"], folders: ["Projects"] });
});

describe("the sidebar tree on startup", () => {
  it("shows the tree as last seen under the rows found so far", () => {
    const { result } = renderHook(() => useVaultFileSearch({ selectedTags: [], panel: "files", rememberedTree: true }), { wrapper });
    expect(result.current.allFiles.map((file) => [file.path, !!file.handle])).toEqual([
      ["found.md", true],
      ["later.md", false],
      ["Projects/plan.md", false],
    ]);
    expect(result.current.folderPaths).toContain("Projects");
  });

  it("shows only what's there once the walk has listed the vault", () => {
    const { result } = renderHook(() => useVaultFileSearch({ selectedTags: [], panel: "files", rememberedTree: true }), { wrapper });
    act(() => store.set(atom_vaultTreeListedKey, VAULT_KEY));
    expect(result.current.allFiles.map((file) => file.path)).toEqual(["found.md"]);
  });

  it("leaves the snapshot out of other file lists", () => {
    const { result } = renderHook(() => useVaultFileSearch({ selectedTags: [], panel: "files" }), { wrapper });
    expect(result.current.allFiles.map((file) => file.path)).toEqual(["found.md"]);
  });
});

describe("useOpenSnapshotRow", () => {
  it("opens a remembered row through the vault by its path", async () => {
    const later = { kind: "file", name: "later.md" } as unknown as FileSystemFileHandle;
    store.set(atom_vaultHandle, vault({ "later.md": later }));
    const openHandle = vi.fn();
    const { result } = renderHook(() => useOpenSnapshotRow(openHandle), { wrapper });
    await act(() => result.current("later.md"));
    expect(openHandle).toHaveBeenCalledWith(later, "later.md");
  });

  it("drops a row whose file is gone and says so", async () => {
    const openHandle = vi.fn();
    const { result } = renderHook(() => useOpenSnapshotRow(openHandle), { wrapper });
    await act(() => result.current("later.md"));
    expect(openHandle).not.toHaveBeenCalled();
    expect(showErrorToast).toHaveBeenCalledWith("“later” isn't in this vault any more.");
    expect(store.get(atom_vaultTreeSnapshot)?.files).toEqual(["found.md", "Projects/plan.md"]);
    expect(store.get(atom_openingFilePath)).toBeNull();
  });
});
