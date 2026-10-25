import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemoryDirectoryHandle } from "../memory-file-system.test-utils";
import { clearScanCache, scanChanges } from "./git-changes-scan";
import { blobId } from "./git-hash";
import { clearObjectCache } from "./git-objects";
import { buildIndex, commitData, fakeId, makeRepoVault, treeData } from "./git-test-utils";

type Loose = Record<string, [string, string | Uint8Array]>;

/** HEAD commit with `head` files (flat or nested), real blob ids. Returns the loose objects and the ids by path. */
async function headObjects(head: Record<string, string>): Promise<{ loose: Loose; ids: Record<string, string> }> {
  const loose: Loose = {};
  const ids: Record<string, string> = {};
  let counter = 100;
  async function tree(prefix: string): Promise<string> {
    const names = new Set<string>();
    for (const path of Object.keys(head)) if (path.startsWith(prefix)) names.add(path.slice(prefix.length).split("/")[0]);
    const entries = [];
    for (const name of [...names].sort()) {
      const full = prefix + name;
      if (full in head) {
        const id = (await blobId(new TextEncoder().encode(head[full])))!;
        loose[id] = ["blob", head[full]];
        ids[full] = id;
        entries.push({ mode: "100644", name, id });
      } else {
        entries.push({ mode: "40000", name, id: await tree(full + "/") });
      }
    }
    const id = fakeId(counter++);
    loose[id] = ["tree", treeData(entries)];
    return id;
  }
  const root = await tree("");
  loose[fakeId(1)] = ["commit", commitData(root)];
  return { loose, ids };
}

async function setup(head: Record<string, string> | null, work: Record<string, string>, extra: { index?: Uint8Array; indexMtimeMs?: number } = {}) {
  clearObjectCache();
  const { loose, ids } = head ? await headObjects(head) : { loose: {}, ids: {} };
  const vault = await makeRepoVault({
    head: "ref: refs/heads/main\n",
    refs: head ? { "refs/heads/main": fakeId(1) } : {},
    loose,
    ...extra,
  });
  for (const [path, text] of Object.entries(work)) await vault.writeText(path, text);
  return { vault, ids };
}

const run = (vault: MemoryDirectoryHandle, isCancelled = () => false) => scanChanges(vault.asHandle(), { onProgress: () => {}, isCancelled });
const summary = (result: Awaited<ReturnType<typeof run>>) => (result !== "cancelled" && result.status === "ok" ? result.files.map((file) => [file.path, file.status]) : result);

beforeEach(() => {
  vi.restoreAllMocks();
  clearScanCache();
});

describe("scanChanges", () => {
  it("classifies added, modified and deleted files, sorted by path", async () => {
    const { vault } = await setup({ "b.md": "one\n", "a.md": "same\n", "gone.md": "x\n", "dir/c.md": "c\n" }, { "b.md": "two\n", "a.md": "same\n", "new.md": "n\n", "dir/c.md": "c\n" });
    const result = await run(vault);
    expect(summary(result)).toEqual([["b.md", "modified"], ["gone.md", "deleted"], ["new.md", "added"]]);
    if (result === "cancelled" || result.status !== "ok") throw new Error("expected ok");
    expect(result.commit).toBe(fakeId(1));
    expect(result.files[0]).toMatchObject({ added: 1, removed: 1 });
    expect(result.files[1]).toMatchObject({ added: 0, removed: 2 });
  });

  it("skips reading a file whose stat matches the index", async () => {
    const { vault, ids } = await setup({ "a.md": "same\n" }, { "a.md": "same\n" }, {
      index: buildIndex([{ path: "a.md", id: fakeId(0), size: 5, mtimeSec: 50 }], 2),
      indexMtimeMs: 100_000,
    });
    // Point the index at the real id.
    const index = buildIndex([{ path: "a.md", id: ids["a.md"], size: 5, mtimeSec: 50 }], 2);
    vault.fileAt(".git/index")!.bytes = index;
    const handle = vault.fileAt("a.md")!;
    handle.lastModified = 50_000;
    const arrayBuffer = vi.fn(async () => new ArrayBuffer(0));
    handle.getFile = async () => ({ name: "a.md", size: 5, lastModified: 50_000, arrayBuffer, text: async () => "" }) as unknown as File;
    vault.fileAt(".git/index")!.lastModified = 100_000;
    expect(summary(await run(vault))).toEqual([]);
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("hashes a file touched in the second the index was written", async () => {
    const { vault, ids } = await setup({ "a.md": "same\n" }, { "a.md": "diff\n" }, { index: new Uint8Array() });
    vault.fileAt(".git/index")!.bytes = buildIndex([{ path: "a.md", id: ids["a.md"], size: 5, mtimeSec: 50 }], 2);
    vault.fileAt(".git/index")!.lastModified = 50_500;
    vault.fileAt("a.md")!.lastModified = 50_100;
    expect(summary(await run(vault))).toEqual([["a.md", "modified"]]);
  });

  it("doesn't read an unchanged file again on the next scan", async () => {
    const { vault } = await setup({ "a.md": "same\n" }, { "a.md": "same\n" });
    const handle = vault.fileAt("a.md")!;
    handle.lastModified = 50_000;
    expect(summary(await run(vault))).toEqual([]);
    const arrayBuffer = vi.fn(async () => new ArrayBuffer(0));
    handle.getFile = async () => ({ name: "a.md", size: 5, lastModified: 50_000, arrayBuffer, text: async () => "" }) as unknown as File;
    expect(summary(await run(vault))).toEqual([]);
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("marks a size mismatch modified without hashing", async () => {
    const { vault, ids } = await setup({ "a.md": "same\n" }, { "a.md": "same!\n" }, { index: new Uint8Array() });
    vault.fileAt(".git/index")!.bytes = buildIndex([{ path: "a.md", id: ids["a.md"], size: 5, mtimeSec: 50 }], 2);
    vault.fileAt(".git/index")!.lastModified = 100_000;
    const digest = vi.spyOn(globalThis.crypto.subtle, "digest");
    expect(summary(await run(vault))).toEqual([["a.md", "modified"]]);
    expect(digest).not.toHaveBeenCalled();
  });

  it("lists everything as added when there are no commits", async () => {
    const { vault } = await setup(null, { "a.md": "a\n", "dir/b.md": "b\n" });
    expect(summary(await run(vault))).toEqual([["a.md", "added"], ["dir/b.md", "added"]]);
  });

  it("returns no-repo without a .git folder", async () => {
    const { MemoryDirectoryHandle } = await import("../memory-file-system.test-utils");
    expect(await run(new MemoryDirectoryHandle("vault"))).toEqual({ status: "no-repo" });
  });

  it("gives a binary file no counts", async () => {
    const { vault } = await setup(null, {});
    const file = await vault.getFileHandle("img.bin", { create: true });
    file.bytes = Uint8Array.from([1, 0, 2]);
    const result = await run(vault);
    if (result === "cancelled" || result.status !== "ok") throw new Error("expected ok");
    expect(result.files[0]).toMatchObject({ path: "img.bin", added: null, removed: null, diff: { kind: "binary" } });
  });

  it("drops a file that only differs in line endings", async () => {
    const { vault } = await setup({ "a.md": "a\nb\n" }, { "a.md": "a\r\nb\r\n" });
    expect(summary(await run(vault))).toEqual([]);
  });

  it("turns diffs past the budget into skipped ones, keeping counts", async () => {
    const work: Record<string, string> = {};
    for (let i = 0; i < 305; i++) work["f" + String(i).padStart(3, "0") + ".md"] = "x\n";
    const { vault } = await setup(null, work);
    const result = await run(vault);
    if (result === "cancelled" || result.status !== "ok") throw new Error("expected ok");
    expect(result.files).toHaveLength(305);
    expect(result.files.filter((file) => file.diff.kind === "skipped")).toHaveLength(5);
    // The budget goes in the order files are found, so which five is not fixed.
    expect(result.files.find((file) => file.diff.kind === "skipped")).toMatchObject({ added: 2 });
  });

  it("compares a staged file with HEAD, not with the index", async () => {
    const { vault } = await setup({ "a.md": "one\n" }, { "a.md": "two\n" }, { index: new Uint8Array() });
    // The index holds the working text (staged), so only HEAD shows the change.
    const staged = (await blobId(new TextEncoder().encode("two\n")))!;
    vault.fileAt(".git/index")!.bytes = buildIndex([{ path: "a.md", id: staged, size: 4, mtimeSec: 1 }], 2);
    const result = await run(vault);
    expect(summary(result)).toEqual([["a.md", "modified"]]);
  });

  it("compares the tracked files the app already knows first, reading each once", async () => {
    const { vault, ids } = await setup({ "a.md": "one\n", "dir/b.md": "b\n" }, { "a.md": "two\n", "dir/b.md": "b\n" }, { index: new Uint8Array() });
    vault.fileAt(".git/index")!.bytes = buildIndex([
      { path: "a.md", id: ids["a.md"], size: 4, mtimeSec: 1 },
      { path: "dir/b.md", id: ids["dir/b.md"], size: 2, mtimeSec: 1 },
    ], 2);
    const handle = vault.fileAt("a.md")!;
    const getFile = vi.spyOn(handle, "getFile");
    const batches: string[][] = [];
    const result = await scanChanges(vault.asHandle(), {
      onProgress: () => {},
      onFiles: (files) => batches.push(files.map((file) => file.path)),
      known: [{ path: "a.md", handle: handle as unknown as FileSystemFileHandle }],
      isCancelled: () => false,
    });
    expect(batches[0]).toEqual(["a.md"]);
    expect(getFile).toHaveBeenCalledTimes(1);
    expect(summary(result)).toEqual([["a.md", "modified"]]);
  });

  it("hands over changed files as they're found, before the result", async () => {
    const { vault } = await setup({ "a.md": "one\n", "gone.md": "x\n" }, { "a.md": "two\n", "new.md": "n\n" });
    const batches: string[][] = [];
    const result = await scanChanges(vault.asHandle(), {
      onProgress: () => {},
      onFiles: (files) => batches.push(files.map((file) => file.path)),
      isCancelled: () => false,
    });
    expect(batches.flat().sort()).toEqual(["a.md", "gone.md", "new.md"]);
    expect(summary(result)).toEqual([["a.md", "modified"], ["gone.md", "deleted"], ["new.md", "added"]]);
  });

  it("returns cancelled when asked to stop", async () => {
    const { vault } = await setup(null, { "a.md": "a\n" });
    expect(await run(vault, () => true)).toBe("cancelled");
  });

  it("does not report a HEAD path under node_modules as deleted", async () => {
    const { vault } = await setup({ "node_modules/x/y.js": "x\n", "a.md": "a\n" }, { "a.md": "a\n" });
    expect(summary(await run(vault))).toEqual([]);
  });
});
