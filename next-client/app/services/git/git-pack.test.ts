import { beforeEach, describe, expect, it } from "vitest";
import { clearObjectCache, readObject } from "./git-objects";
import { applyDelta } from "./git-pack";
import { buildPack, fakeId, makeDelta, makeRepoVault } from "./git-test-utils";

const enc = new TextEncoder();
const dec = new TextDecoder();

beforeEach(clearObjectCache);

async function gitDir(packs: Record<string, { pack: Uint8Array; idx: Uint8Array }>) {
  const vault = await makeRepoVault({ packs });
  return (await vault.getDirectoryHandle(".git")) as unknown as FileSystemDirectoryHandle;
}

describe("applyDelta", () => {
  it("handles copy and insert ops", () => {
    const base = enc.encode("hello world");
    const delta = makeDelta(base.length, [{ copy: { offset: 0, size: 5 } }, { insert: ", brave" }, { copy: { offset: 5, size: 6 } }]);
    expect(dec.decode(applyDelta(base, delta))).toBe("hello, brave world");
  });

  it("treats a copy size of 0 as 0x10000", () => {
    const base = new Uint8Array(0x10000).fill(7);
    const out = applyDelta(base, makeDelta(base.length, [{ copy: { offset: 0, size: 0x10000 } }]));
    expect(out.length).toBe(0x10000);
  });
});

describe("pack reading", () => {
  it("reads a plain blob", async () => {
    const { pack, idx } = buildPack([{ id: fakeId(0x10), type: "blob", data: "packed text\n" }]);
    const dir = await gitDir({ "pack-a": { pack, idx } });
    expect(dec.decode((await readObject(dir, fakeId(0x10))).data)).toBe("packed text\n");
  });

  it("resolves an OFS_DELTA blob", async () => {
    const base = "line one\nline two\n";
    const delta = makeDelta(base.length, [{ copy: { offset: 0, size: base.length } }, { insert: "line three\n" }]);
    const { pack, idx } = buildPack([
      { id: fakeId(0x20), type: "blob", data: base },
      { id: fakeId(0x21), delta, baseOffsetOf: fakeId(0x20) },
    ]);
    const dir = await gitDir({ "pack-a": { pack, idx } });
    const object = await readObject(dir, fakeId(0x21));
    expect(object.type).toBe("blob");
    expect(dec.decode(object.data)).toBe(base + "line three\n");
  });

  it("resolves a REF_DELTA blob, with its base in another pack", async () => {
    const base = "alpha\nbeta\n";
    const delta = makeDelta(base.length, [{ insert: "new\n" }, { copy: { offset: 0, size: base.length } }]);
    const one = buildPack([{ id: fakeId(0x30), type: "blob", data: base }]);
    const two = buildPack([{ id: fakeId(0x31), delta, baseId: fakeId(0x30) }]);
    const dir = await gitDir({ "pack-a": one, "pack-b": two });
    expect(dec.decode((await readObject(dir, fakeId(0x31))).data)).toBe("new\n" + base);
  });

  it("finds an entry through the large-offset table", async () => {
    const { pack, idx } = buildPack(
      [{ id: fakeId(0x40), type: "blob", data: "big offset\n" }, { id: fakeId(0x41), type: "blob", data: "other\n" }],
      fakeId(0x41),
    );
    const dir = await gitDir({ "pack-a": { pack, idx } });
    expect(dec.decode((await readObject(dir, fakeId(0x41))).data)).toBe("other\n");
    expect(dec.decode((await readObject(dir, fakeId(0x40))).data)).toBe("big offset\n");
  });

  it("inflates an entry longer than the first window", async () => {
    let seed = 1;
    const noisy = Uint8Array.from({ length: 200 * 1024 }, () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) >> 16) & 0xff);
    const { pack, idx } = buildPack([{ id: fakeId(0x50), type: "blob", data: noisy }]);
    const dir = await gitDir({ "pack-a": { pack, idx } });
    const object = await readObject(dir, fakeId(0x50));
    expect(object.data.length).toBe(noisy.length);
    expect(object.data.subarray(0, 64)).toEqual(noisy.subarray(0, 64));
    expect(object.data.subarray(-64)).toEqual(noisy.subarray(-64));
  });

  it("finds an object in a pack added after the first read", async () => {
    const one = buildPack([{ id: fakeId(0x70), type: "blob", data: "first\n" }]);
    const vault = await makeRepoVault({ packs: { "pack-a": one } });
    const git = await vault.getDirectoryHandle(".git");
    const dir = git as unknown as FileSystemDirectoryHandle;
    expect(dec.decode((await readObject(dir, fakeId(0x70))).data)).toBe("first\n");

    const two = buildPack([{ id: fakeId(0x71), type: "blob", data: "fetched\n" }]);
    (await git.writeText("objects/pack/pack-b.pack", "")).bytes = two.pack;
    (await git.writeText("objects/pack/pack-b.idx", "")).bytes = two.idx;
    expect(dec.decode((await readObject(dir, fakeId(0x71))).data)).toBe("fetched\n");
  });

  it("throws NotFound for an id in no pack", async () => {
    const { pack, idx } = buildPack([{ id: fakeId(0x60), type: "blob", data: "x" }]);
    const dir = await gitDir({ "pack-a": { pack, idx } });
    await expect(readObject(dir, fakeId(0x61))).rejects.toMatchObject({ name: "NotFound" });
  });
});
