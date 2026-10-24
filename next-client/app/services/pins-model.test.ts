// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  addPins,
  forgetPinPaths,
  listedPins,
  PINS_MAX,
  pinsOverLimit,
  movePin,
  normalizePinIcon,
  pinKey,
  removePin,
  remapPinPaths,
  samePins,
  setPinIcon,
  type PinsDocument,
} from "./pins-model";

const docOf = (...items: unknown[]): PinsDocument => ({ items });
const frozen = (doc: PinsDocument) => JSON.stringify(doc);

describe("listedPins", () => {
  it("lists all four kinds and their icons", () => {
    expect(listedPins(docOf({ note: "projects/roadmap.md", icon: "🚀" }, { folder: "projects" }, { tag: "release", icon: "🏷️" }, { page: "tasks" }))).toEqual([
      { kind: "note", target: "projects/roadmap.md", icon: "🚀" },
      { kind: "folder", target: "projects", icon: null },
      { kind: "tag", target: "release", icon: "🏷️" },
      { kind: "page", target: "tasks", icon: null },
    ]);
  });

  it("normalises a note path, a folder's trailing slash and a tag", () => {
    const doc = docOf({ note: "./roadmap.md" }, { note: "/bug.md" }, { folder: "projects/" }, { tag: "#Release" });
    expect(listedPins(doc).map(pinKey)).toEqual(["note:roadmap.md", "note:bug.md", "folder:projects", "tag:release"]);
  });

  it("doesn't list entries that break the rules, or duplicates", () => {
    const doc = docOf(
      { note: "../outside.md" }, { note: "projects\\roadmap.md" }, { note: "projects/roadmap.txt" }, { folder: "/" },
      { page: "inbox" }, { note: "a.md", folder: "projects" }, { link: "example" }, "just text", ["note", "a.md"],
      { tag: "bug", icon: "🚀" }, { tag: "Bug" },
    );
    expect(listedPins(doc)).toEqual([{ kind: "tag", target: "bug", icon: "🚀" }]);
  });
});

describe("normalizePinIcon", () => {
  it("accepts exactly one emoji grapheme", () => {
    expect(normalizePinIcon(" 🚀 ")).toBe("🚀");
    expect(normalizePinIcon("🇷🇴")).toBe("🇷🇴");
    expect(normalizePinIcon("1️⃣")).toBe("1️⃣");
    expect(normalizePinIcon("🧑‍💻")).toBe("🧑‍💻");
  });

  it("ignores anything else", () => {
    for (const value of ["abc", "🚀🚀", "", 42, null, undefined]) expect(normalizePinIcon(value)).toBeNull();
  });

  it("drops a bad icon but keeps the pin", () => {
    expect(listedPins(docOf({ tag: "bug", icon: "abc" }, { tag: "release", icon: 42 })).map((pin) => pin.icon)).toEqual([null, null]);
  });
});

describe("edits", () => {
  const base = () => docOf({ note: "projects/roadmap.md", icon: "🚀", color: "blue" }, { widget: "clock" }, { tag: "release" }, { page: "tasks" });

  it("addPins appends new pins in order and skips present ones", () => {
    const doc = base();
    const before = frozen(doc);
    const next = addPins(doc, [{ kind: "tag", target: "release" }, { kind: "folder", target: "projects" }, { kind: "tag", target: "bug" }])!;
    expect(listedPins(next).map(pinKey)).toEqual(["note:projects/roadmap.md", "tag:release", "page:tasks", "folder:projects", "tag:bug"]);
    expect(addPins(next, [{ kind: "page", target: "tasks" }])).toBeNull();
    expect(addPins(next, [{ kind: "note", target: "../outside.md" }])).toBeNull();
    expect(frozen(doc)).toBe(before);
  });

  it("adds no more than PINS_MAX listed pins, and says when some don't fit", () => {
    const doc = base();
    const tags = (n: number) => Array.from({ length: n }, (_, i) => ({ kind: "tag" as const, target: `t${i}` }));
    expect(pinsOverLimit(doc, tags(PINS_MAX - 3))).toBe(false);
    expect(pinsOverLimit(doc, tags(PINS_MAX - 2))).toBe(true);
    const full = addPins(doc, tags(20))!;
    expect(listedPins(full)).toHaveLength(PINS_MAX);
    expect(addPins(full, [{ kind: "folder", target: "projects" }])).toBeNull();
    // Already pinned isn't "new": no complaint when the list is full.
    expect(pinsOverLimit(full, [{ kind: "tag", target: "release" }])).toBe(false);
  });

  it("removePin removes the entry, and returns null when it isn't there", () => {
    const doc = base();
    const before = frozen(doc);
    expect(listedPins(removePin(doc, "tag:release")!).map(pinKey)).toEqual(["note:projects/roadmap.md", "page:tasks"]);
    expect(removePin(doc, "tag:bug")).toBeNull();
    expect(frozen(doc)).toBe(before);
  });

  it("setPinIcon sets, replaces and clears an icon, keeping other keys", () => {
    const doc = base();
    const before = frozen(doc);
    const set = setPinIcon(doc, "tag:release", "🏷️")!;
    expect(set.items[2]).toEqual({ tag: "release", icon: "🏷️" });
    const replaced = setPinIcon(doc, "note:projects/roadmap.md", "✅")!;
    expect(replaced.items[0]).toEqual({ note: "projects/roadmap.md", icon: "✅", color: "blue" });
    const cleared = setPinIcon(doc, "note:projects/roadmap.md", null)!;
    expect(cleared.items[0]).toEqual({ note: "projects/roadmap.md", color: "blue" });
    expect(setPinIcon(doc, "note:projects/roadmap.md", "🚀")).toBeNull();
    expect(setPinIcon(doc, "tag:release", null)).toBeNull();
    expect(setPinIcon(doc, "tag:bug", "🚀")).toBeNull();
    expect(frozen(doc)).toBe(before);
  });

  it("movePin moves to a listed position, leaving hidden entries in place", () => {
    const doc = base();
    const before = frozen(doc);
    const listed = ["note:projects/roadmap.md", "tag:release", "page:tasks"];
    const down = movePin(doc, "note:projects/roadmap.md", 1, listed)!;
    expect(down.items).toEqual([doc.items[2], { widget: "clock" }, doc.items[0], doc.items[3]]);
    const last = movePin(doc, "note:projects/roadmap.md", 2, listed)!;
    expect(last.items).toEqual([doc.items[2], { widget: "clock" }, doc.items[3], doc.items[0]]);
    const first = movePin(doc, "page:tasks", 0, listed)!;
    expect(listedPins(first).map(pinKey)).toEqual(["page:tasks", "note:projects/roadmap.md", "tag:release"]);
    expect(first.items[1]).toEqual({ widget: "clock" });
    expect(movePin(doc, "note:projects/roadmap.md", 0, listed)).toBeNull();
    expect(movePin(doc, "note:projects/roadmap.md", -1, listed)).toBeNull();
    expect(movePin(doc, "page:tasks", 3, listed)).toBeNull();
    expect(movePin(doc, "tag:bug", 0, listed)).toBeNull();
    expect(frozen(doc)).toBe(before);
  });

  it("remapPinPaths moves notes and folders at and under a moved folder, never a name-prefix sibling", () => {
    const doc = docOf({ note: "notes/deep/idea.md", icon: "🚀" }, { folder: "notes" }, { folder: "notes/deep" }, { note: "notes-old.md" }, { tag: "notes" });
    const before = frozen(doc);
    const next = remapPinPaths(doc, "notes", "archive")!;
    expect(next.items).toEqual([
      { note: "archive/deep/idea.md", icon: "🚀" },
      { folder: "archive" },
      { folder: "archive/deep" },
      { note: "notes-old.md" },
      { tag: "notes" },
    ]);
    expect(remapPinPaths(doc, "inbox", "archive")).toBeNull();
    expect(listedPins(remapPinPaths(doc, "notes-old.md", "done.md")!).map(pinKey)).toContain("note:done.md");
    expect(frozen(doc)).toBe(before);
  });

  it("forgetPinPaths removes notes and folders at and under a deleted path", () => {
    const doc = docOf({ note: "notes/deep/idea.md" }, { folder: "notes" }, { note: "notes-old.md" }, { tag: "notes" });
    const next = forgetPinPaths(doc, "notes")!;
    expect(listedPins(next).map(pinKey)).toEqual(["note:notes-old.md", "tag:notes"]);
    expect(forgetPinPaths(doc, "inbox")).toBeNull();
  });

  it("samePins compares kind, target and icon in order", () => {
    const a = listedPins(base());
    expect(samePins(a, listedPins(base()))).toBe(true);
    expect(samePins(a, [...a].reverse())).toBe(false);
    expect(samePins(a, a.slice(1))).toBe(false);
  });
});
