import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_vaultFolderPaths, atom_vaultHandle } from "@/app/atoms/atoms";
import { useCreateItem } from "./use-create-item";

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../use-dialog", () => ({ useDialog: () => ({ prompt: vi.fn(), select: vi.fn() }) }));
vi.mock("./directory-ops", () => ({ uniqueFolderName: vi.fn(async (_dir: unknown, name: string) => name) }));
vi.mock("@/app/services/file-writer", () => ({ writeFileContent: vi.fn() }));

const created = { kind: "directory", name: "Projects" } as unknown as FileSystemDirectoryHandle;
const vault = {
  kind: "directory",
  name: "vault",
  getDirectoryHandle: vi.fn(async () => created),
  resolve: vi.fn(async () => ["Projects"]),
} as unknown as FileSystemDirectoryHandle;

function setup() {
  const store = createStore();
  store.set(atom_vaultHandle, vault);
  const props = { scanVault: vi.fn(async () => {}), indexVaultTags: vi.fn(async () => {}), openFile: vi.fn(async () => {}) };
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useCreateItem(props), { wrapper });
  return { store, props, result };
}

describe("useCreateItem folders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists a new folder at once and re-indexes, so a running index can't drop it", async () => {
    const { store, props, result } = setup();

    await act(async () => { await result.current.createFolder(vault, "Projects"); });

    expect(store.get(atom_vaultFolderPaths)).toEqual(["Projects"]);
    expect(props.scanVault).toHaveBeenCalledWith(vault);
    expect(props.indexVaultTags).toHaveBeenCalledTimes(1);
  });
});
