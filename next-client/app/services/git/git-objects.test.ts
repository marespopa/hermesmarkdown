import { beforeEach, describe, expect, it } from "vitest";
import { clearObjectCache, readObject } from "./git-objects";
import { fakeId, makeRepoVault } from "./git-test-utils";

beforeEach(clearObjectCache);

describe("readObject", () => {
  it("reads a loose object and strips its header", async () => {
    const vault = await makeRepoVault({ loose: { [fakeId(0xa1)]: ["blob", "hello\n"] } });
    const dir = (await vault.getDirectoryHandle(".git")) as unknown as FileSystemDirectoryHandle;
    const object = await readObject(dir, fakeId(0xa1));
    expect(object.type).toBe("blob");
    expect(new TextDecoder().decode(object.data)).toBe("hello\n");
  });

  it("throws NotFound for an unknown id", async () => {
    const vault = await makeRepoVault({});
    const dir = (await vault.getDirectoryHandle(".git")) as unknown as FileSystemDirectoryHandle;
    await expect(readObject(dir, fakeId(0x77))).rejects.toMatchObject({ name: "NotFound" });
  });

  it("serves a repeated read from its cache", async () => {
    const vault = await makeRepoVault({ loose: { [fakeId(0xa1)]: ["blob", "hello\n"] } });
    const git = await vault.getDirectoryHandle(".git");
    const dir = git as unknown as FileSystemDirectoryHandle;
    const first = await readObject(dir, fakeId(0xa1));
    await git.removeEntry("objects");
    expect(await readObject(dir, fakeId(0xa1))).toBe(first);
  });
});
