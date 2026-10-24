// @vitest-environment node
import { describe, expect, it } from "vitest";
import { dump, load } from "js-yaml";
import {
  addPins,
  forgetPinPaths,
  listedPins,
  insertPins,
  PINS_MAX,
  pinsOverLimit,
  movePin,
  normalizePinIcon,
  parsePins,
  PINS_HEADER,
  pinKey,
  removePin,
  remapPinPaths,
  samePins,
  serializePins,
  setPinIcon,
  type PinsDocument,
} from "./vault-pins-format";

const parse = (text: string) => parsePins(text, load);
const docOf = (text: string): PinsDocument => {
  const parsed = parse(text);
  if (!parsed.ok) throw new Error("invalid");
  return parsed.doc;
};
const frozen = (doc: PinsDocument) => JSON.stringify(doc);

describe("parsePins", () => {
  it("parses all four kinds and their icons", () => {
    const parsed = parse([
      "version: 1",
      "pins:",
      "  - {note: projects/roadmap.md, icon: 🚀}",
      "  - {folder: projects}",
      "  - {tag: release, icon: 🏷️}",
      "  - {page: tasks}",
    ].join("\n"));
    expect(parsed).toMatchObject({ ok: true, newer: false });
    expect(parsed.ok && parsed.pins).toEqual([
      { kind: "note", target: "projects/roadmap.md", icon: "🚀" },
      { kind: "folder", target: "projects", icon: null },
      { kind: "tag", target: "release", icon: "🏷️" },
      { kind: "page", target: "tasks", icon: null },
    ]);
  });

  it("normalises a note path, a folder's trailing slash and a tag", () => {
    const parsed = parse("pins:\n  - {note: ./roadmap.md}\n  - {note: /bug.md}\n  - {folder: projects/}\n  - {tag: '#Release'}");
    expect(parsed.ok && parsed.pins.map(pinKey)).toEqual(["note:roadmap.md", "note:bug.md", "folder:projects", "tag:release"]);
  });

  it("doesn't list entries that break the rules, and keeps them in items", () => {
    const parsed = parse([
      "pins:",
      "  - {note: ../outside.md}",
      "  - {note: 'projects\\\\roadmap.md'}",
      "  - {note: projects/roadmap.txt}",
      "  - {folder: /}",
      "  - {page: inbox}",
      "  - {note: a.md, folder: projects}",
      "  - {link: example}",
      "  - just text",
      "  - [note, a.md]",
      "  - {tag: bug}",
    ].join("\n"));
    expect(parsed.ok && parsed.pins.map(pinKey)).toEqual(["tag:bug"]);
    expect(parsed.ok && parsed.doc.items).toHaveLength(10);
  });

  it("lists only the first of duplicate pins", () => {
    const parsed = parse("pins:\n  - {tag: release, icon: 🚀}\n  - {tag: Release}\n  - {page: tasks}");
    expect(parsed.ok && parsed.pins).toEqual([
      { kind: "tag", target: "release", icon: "🚀" },
      { kind: "page", target: "tasks", icon: null },
    ]);
  });

  it("gives no pins for an empty file, a comment-only file and a missing pins key", () => {
    for (const text of ["", "# nothing pinned yet\n", "version: 1\n", "pins:\n"]) {
      const parsed = parse(text);
      expect(parsed).toMatchObject({ ok: true, pins: [] });
    }
  });

  it("is invalid for broken YAML, a list root or a pins value that isn't a list", () => {
    expect(parse("pins: [\n  {note: a.md")).toEqual({ ok: false });
    expect(parse("- {tag: bug}")).toEqual({ ok: false });
    expect(parse("pins: release")).toEqual({ ok: false });
  });

  it("marks a file from a newer version", () => {
    const parsed = parse("version: 2\npins:\n  - {tag: bug}\n  - {widget: clock}");
    expect(parsed).toMatchObject({ ok: true, newer: true });
    expect(parsed.ok && parsed.pins.map(pinKey)).toEqual(["tag:bug"]);
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
    const parsed = parse("pins:\n  - {tag: bug, icon: abc}\n  - {tag: release, icon: 42}");
    expect(parsed.ok && parsed.pins.map((pin) => pin.icon)).toEqual([null, null]);
  });
});

describe("edits", () => {
  const base = () => docOf("pins:\n  - {note: projects/roadmap.md, icon: 🚀, color: blue}\n  - {widget: clock}\n  - {tag: release}\n  - {page: tasks}");

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
    expect(insertPins(full, [{ kind: "folder", target: "projects" }], 0, listedPins(full).map(pinKey))).toBeNull();
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

  it("insertPins adds dropped pins at the insertion point, and moves ones already pinned there", () => {
    const doc = base();
    const before = frozen(doc);
    const listed = ["note:projects/roadmap.md", "tag:release", "page:tasks"];
    const added = insertPins(doc, [{ kind: "folder", target: "projects" }], 1, listed)!;
    expect(listedPins(added).map(pinKey)).toEqual(["note:projects/roadmap.md", "folder:projects", "tag:release", "page:tasks"]);
    expect(added.items[1]).toEqual({ widget: "clock" });
    const mixed = insertPins(doc, [{ kind: "note", target: "notes/launch.md" }, { kind: "page", target: "tasks" }], 0, listed)!;
    expect(listedPins(mixed).map(pinKey)).toEqual(["note:notes/launch.md", "page:tasks", "note:projects/roadmap.md", "tag:release"]);
    const atEnd = insertPins(doc, [{ kind: "folder", target: "projects" }], 3, listed)!;
    expect(listedPins(atEnd).map(pinKey)).toEqual([...listed, "folder:projects"]);
    expect(insertPins(doc, [{ kind: "tag", target: "release" }], 1, listed)).toBeNull();
    expect(insertPins(doc, [{ kind: "note", target: "../outside.md" }], 0, listed)).toBeNull();
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
    const doc = docOf("pins:\n  - {note: notes/deep/idea.md, icon: 🚀}\n  - {folder: notes}\n  - {folder: notes/deep}\n  - {note: notes-old.md}\n  - {tag: notes}");
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
    const doc = docOf("pins:\n  - {note: notes/deep/idea.md}\n  - {folder: notes}\n  - {note: notes-old.md}\n  - {tag: notes}");
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

describe("serializePins", () => {
  it("writes the header, version 1, unknown keys and one line per pin, and round-trips", () => {
    const doc = docOf("theme: compact\npins:\n  - {note: projects/roadmap.md, icon: 🚀, color: blue}\n  - {folder: projects}\n  - {widget: clock}");
    const text = serializePins(doc, dump);
    const lines = text.split("\n");
    expect(lines[0]).toBe(PINS_HEADER);
    expect(lines[1]).toBe("version: 1");
    expect(text).toContain("theme: compact");
    expect(lines.filter((line) => line.startsWith("  - "))).toHaveLength(3);
    expect(text).toContain("  - {folder: projects}");
    expect(text).toContain("  - {widget: clock}");
    expect(load(text)).toEqual({
      version: 1,
      theme: "compact",
      pins: [{ note: "projects/roadmap.md", icon: "🚀", color: "blue" }, { folder: "projects" }, { widget: "clock" }],
    });
  });

  it("writes an empty list when nothing is pinned", () => {
    expect(load(serializePins({ root: {}, items: [] }, dump))).toEqual({ version: 1, pins: [] });
  });
});
