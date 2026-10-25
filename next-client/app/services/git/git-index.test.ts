import { describe, expect, it } from "vitest";
import { parseIndex } from "./git-index";
import { buildIndex, fakeId } from "./git-test-utils";

const entries = [
  { path: "a.md", id: fakeId(1), size: 5, mtimeSec: 100 },
  { path: "notes/deep/b.md", id: fakeId(2), size: 7, mtimeSec: 200 },
  { path: "notes/deep/c.md", id: fakeId(3), size: 9, mtimeSec: 300 },
  { path: "z.md", id: fakeId(4), size: 11, mtimeSec: 400 },
];

describe("parseIndex", () => {
  it("reads version 2 entries with padding", () => {
    const parsed = parseIndex(buildIndex(entries, 2))!;
    expect([...parsed.keys()]).toEqual(entries.map((entry) => entry.path));
    expect(parsed.get("notes/deep/b.md")).toMatchObject({ id: fakeId(2), size: 7, mtimeSec: 200, stage: 0 });
  });

  it("reads version 3 with an extended-flags entry", () => {
    const parsed = parseIndex(buildIndex([{ ...entries[0], extended: true }, entries[1]], 3))!;
    expect(parsed.get("a.md")?.id).toBe(fakeId(1));
    expect(parsed.get("notes/deep/b.md")?.size).toBe(7);
  });

  it("reads version 4 prefix-compressed paths", () => {
    const parsed = parseIndex(buildIndex(entries, 4))!;
    expect([...parsed.keys()]).toEqual(entries.map((entry) => entry.path));
    expect(parsed.get("z.md")?.mtimeSec).toBe(400);
  });

  it("reports the stage of conflicted entries", () => {
    const parsed = parseIndex(buildIndex([{ path: "a.md", id: fakeId(1), stage: 2 }], 2))!;
    expect(parsed.get("a.md")?.stage).toBe(2);
  });

  it("skips sparse directory entries", () => {
    const parsed = parseIndex(buildIndex([{ path: "dir/", id: fakeId(1), mode: 0o040000 }, entries[0]], 2))!;
    expect([...parsed.keys()]).toEqual(["a.md"]);
  });

  it("returns null for a bad signature or version", () => {
    const bytes = buildIndex(entries, 2);
    bytes[0] = 0x58;
    expect(parseIndex(bytes)).toBeNull();
    const old = buildIndex(entries, 2);
    old[7] = 9;
    expect(parseIndex(old)).toBeNull();
  });
});
