import { describe, expect, it } from "vitest";
import { blobAtPath, listTreeFiles } from "./git-tree";
import { clearObjectCache } from "./git-objects";
import { commitData, fakeId, makeRepoVault, treeData } from "./git-test-utils";

async function repo() {
  clearObjectCache();
  const vault = await makeRepoVault({
    loose: {
      [fakeId(1)]: ["commit", commitData(fakeId(2))],
      [fakeId(2)]: ["tree", treeData([{ mode: "100644", name: "top.md", id: fakeId(5) }, { mode: "40000", name: "notes", id: fakeId(3) }])],
      [fakeId(3)]: ["tree", treeData([{ mode: "100644", name: "a.md", id: fakeId(4) }])],
      [fakeId(4)]: ["blob", "nested text\n"],
      [fakeId(5)]: ["blob", "top text\n"],
    },
  });
  return (await vault.getDirectoryHandle(".git")) as unknown as FileSystemDirectoryHandle;
}

describe("blobAtPath", () => {
  it("resolves a nested path", async () => {
    const dir = await repo();
    expect(new TextDecoder().decode((await blobAtPath(dir, fakeId(1), "notes/a.md"))!)).toBe("nested text\n");
    expect(new TextDecoder().decode((await blobAtPath(dir, fakeId(1), "top.md"))!)).toBe("top text\n");
  });

  it("returns null for a missing segment", async () => {
    const dir = await repo();
    expect(await blobAtPath(dir, fakeId(1), "notes/missing.md")).toBeNull();
    expect(await blobAtPath(dir, fakeId(1), "nope/a.md")).toBeNull();
  });

  it("returns null for a path that names a tree", async () => {
    expect(await blobAtPath(await repo(), fakeId(1), "notes")).toBeNull();
  });
});

describe("listTreeFiles", () => {
  it("walks a nested tree, skipping symlinks and listing submodules apart", async () => {
    clearObjectCache();
    const vault = await makeRepoVault({
      loose: {
        [fakeId(1)]: ["commit", commitData(fakeId(2))],
        [fakeId(2)]: [
          "tree",
          treeData([
            { mode: "100644", name: "top.md", id: fakeId(5) },
            { mode: "40000", name: "notes", id: fakeId(3) },
            { mode: "120000", name: "link", id: fakeId(6) },
            { mode: "160000", name: "mod", id: fakeId(7) },
          ]),
        ],
        [fakeId(3)]: ["tree", treeData([{ mode: "100755", name: "a.md", id: fakeId(4) }])],
      },
    });
    const dir = (await vault.getDirectoryHandle(".git")) as unknown as FileSystemDirectoryHandle;
    const listing = await listTreeFiles(dir, fakeId(1));
    expect([...listing.files.keys()].sort()).toEqual(["notes/a.md", "top.md"]);
    expect(listing.files.get("notes/a.md")).toEqual({ id: fakeId(4), mode: "100755" });
    expect([...listing.submodules]).toEqual(["mod"]);
  });
});
