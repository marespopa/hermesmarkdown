import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_vaultFolderPaths, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_lastSaveFolder } from "@/app/atoms/ui-atoms";
import { useAskSaveFolder } from "./use-ask-save-folder";

const select = vi.fn();
vi.mock("../use-dialog", () => ({ useDialog: () => ({ select }) }));

type Option = { label: string; value: string };

function setup(folders = ["Projects", "Areas", "_templates", "Areas/.trash"]) {
  const store = createStore();
  store.set(atom_vaultHandle, { name: "vault" } as unknown as FileSystemDirectoryHandle);
  store.set(atom_vaultFolderPaths, folders);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useAskSaveFolder(), { wrapper });
  const ask = async (title = 'Save "Idea.md"') => {
    let folder: string | null = null;
    await act(async () => { folder = await result.current(title); });
    return folder as string | null;
  };
  const options = () => select.mock.calls.at(-1)![1] as Option[];
  return { store, ask, options };
}

describe("useAskSaveFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    select.mockResolvedValue("__root__");
  });

  it("offers the root, then the visible folders in order, under the given title", async () => {
    const { ask, options } = setup();
    expect(await ask()).toBe("");
    expect(select).toHaveBeenCalledWith("Choose a folder:", expect.any(Array), 'Save "Idea.md"');
    expect(options().map((option) => option.label)).toEqual(["/ vault (root)", "Areas", "Projects"]);
  });

  it("resolves to the picked folder and lists it first the next time", async () => {
    select.mockResolvedValue("path:Projects");
    const { store, ask, options } = setup();
    expect(await ask()).toBe("Projects");
    expect(store.get(atom_lastSaveFolder)).toBe("Projects");
    await ask();
    expect(options().map((option) => option.label)).toEqual(["Projects", "/ vault (root)", "Areas"]);
  });

  it("resolves to null and remembers nothing when cancelled", async () => {
    select.mockResolvedValue(null);
    const { store, ask } = setup();
    expect(await ask()).toBeNull();
    expect(store.get(atom_lastSaveFolder)).toBe("");
  });

  it("keeps the usual order when the last folder is gone", async () => {
    const { store, ask, options } = setup();
    store.set(atom_lastSaveFolder, "Archive");
    await ask();
    expect(options()[0].label).toBe("/ vault (root)");
  });

  it("asks nothing without a vault", async () => {
    const { store, ask } = setup();
    store.set(atom_vaultHandle, null);
    expect(await ask()).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });
});
