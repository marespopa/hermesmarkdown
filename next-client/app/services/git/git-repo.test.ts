import { describe, expect, it } from "vitest";
import { MemoryDirectoryHandle } from "../memory-file-system.test-utils";
import { openRepo } from "./git-repo";
import { makeRepoVault } from "./git-test-utils";

describe("openRepo", () => {
  it("opens a vault with a .git folder", async () => {
    const vault = await makeRepoVault({ head: "ref: refs/heads/main", config: "[core]\n\trepositoryformatversion = 0\n" });
    expect(await openRepo(vault as unknown as FileSystemDirectoryHandle)).not.toBeNull();
  });

  it("returns null without a .git folder", async () => {
    expect(await openRepo(new MemoryDirectoryHandle("vault") as unknown as FileSystemDirectoryHandle)).toBeNull();
  });

  it("returns null when .git is a file", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText(".git", "gitdir: ../elsewhere");
    expect(await openRepo(vault as unknown as FileSystemDirectoryHandle)).toBeNull();
  });

  it("throws when .git can't be opened, rather than calling it missing", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    vault.getDirectoryHandle = async () => {
      throw new DOMException("denied", "NotAllowedError");
    };
    await expect(openRepo(vault as unknown as FileSystemDirectoryHandle)).rejects.toThrow("denied");
  });

  it("returns null for a sha256 repository", async () => {
    const vault = await makeRepoVault({ config: "[extensions]\n\tobjectformat = sha256\n" });
    expect(await openRepo(vault as unknown as FileSystemDirectoryHandle)).toBeNull();
  });
});
