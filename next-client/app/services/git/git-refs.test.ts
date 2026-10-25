import { describe, expect, it } from "vitest";
import { MemoryDirectoryHandle } from "../memory-file-system.test-utils";
import { resolveHead } from "./git-refs";
import { fakeId, makeRepoVault } from "./git-test-utils";

async function gitDir(files: Parameters<typeof makeRepoVault>[0]) {
  return (await (await makeRepoVault(files)).getDirectoryHandle(".git")) as unknown as FileSystemDirectoryHandle;
}

describe("resolveHead", () => {
  it("reads a symbolic HEAD through a loose ref", async () => {
    const dir = await gitDir({ head: "ref: refs/heads/main\n", refs: { "refs/heads/main": fakeId(0xabc) } });
    expect((await resolveHead(dir)).commit).toBe(fakeId(0xabc));
  });

  it("falls back to packed-refs, skipping comment and peeled lines", async () => {
    const packedRefs = ["# pack-refs with: peeled", fakeId(1) + " refs/heads/other", "^" + fakeId(9), fakeId(2) + " refs/heads/main", ""].join("\n");
    const dir = await gitDir({ head: "ref: refs/heads/main", packedRefs });
    expect((await resolveHead(dir)).commit).toBe(fakeId(2));
  });

  it("reads a detached HEAD", async () => {
    const dir = await gitDir({ head: fakeId(0xdef) + "\n" });
    expect((await resolveHead(dir)).commit).toBe(fakeId(0xdef));
  });

  it("has no commit when the ref is missing", async () => {
    const dir = await gitDir({ head: "ref: refs/heads/main" });
    expect((await resolveHead(dir)).commit).toBeNull();
  });

  it("changes its stamp when the ref file changes", async () => {
    const vault = await makeRepoVault({ head: "ref: refs/heads/main", refs: { "refs/heads/main": fakeId(1) } });
    const git = (await vault.getDirectoryHandle(".git")) as MemoryDirectoryHandle;
    const handle = git as unknown as FileSystemDirectoryHandle;
    const before = await resolveHead(handle);
    const ref = await git.writeText("refs/heads/main", fakeId(1) + "\n");
    ref.lastModified = 5000;
    const after = await resolveHead(handle);
    expect(after.stamp).not.toBe(before.stamp);
    expect((await resolveHead(handle)).stamp).toBe(after.stamp);
  });
});
