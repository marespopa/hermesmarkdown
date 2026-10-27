import React from "react";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it } from "vitest";
import { atom_addPendingTree, atom_removePendingTree } from "@/app/atoms/pending-tree-atoms";
import { atom_showHiddenFiles } from "@/app/atoms/ui-atoms";
import { useVaultFileSearch } from "./useVaultFileSearch";

function setup() {
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const hook = renderHook(() => useVaultFileSearch({ selectedTags: [], panel: "files" }), { wrapper });
  return { store, hook };
}

describe("useVaultFileSearch pending rows", () => {
  it("lists pending files without a handle and pending folders, until removed", () => {
    const { store, hook } = setup();
    act(() => {
      store.set(atom_addPendingTree, ["run-1", {
        files: ["Acme/README.md", "Acme/Notes/Kickoff.md"],
        folders: ["Acme", "Acme/Notes"],
      }]);
    });
    expect(hook.result.current.allFiles).toEqual([
      { name: "Kickoff.md", kind: "file", handle: null, path: "Acme/Notes/Kickoff.md" },
      { name: "README.md", kind: "file", handle: null, path: "Acme/README.md" },
    ]);
    expect(hook.result.current.folderPaths).toEqual(["Acme", "Acme/Notes"]);

    act(() => { store.set(atom_removePendingTree, "run-1"); });
    expect(hook.result.current.allFiles).toEqual([]);
    expect(hook.result.current.folderPaths).toEqual([]);
  });

  it("keeps _-prefixed pending paths hidden unless hidden files are shown", () => {
    const { store, hook } = setup();
    act(() => {
      store.set(atom_showHiddenFiles, false);
      store.set(atom_addPendingTree, ["run-1", { files: ["_archive/Acme/README.md"], folders: ["_archive", "_archive/Acme"] }]);
    });
    expect(hook.result.current.allFiles).toEqual([]);
    expect(hook.result.current.folderPaths).toEqual([]);

    act(() => { store.set(atom_showHiddenFiles, true); });
    expect(hook.result.current.allFiles.map((file) => file.path)).toEqual(["_archive/Acme/README.md"]);
    expect(hook.result.current.folderPaths).toEqual(["_archive", "_archive/Acme"]);
  });
});
