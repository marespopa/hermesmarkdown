import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultStore } from "jotai";
import type { FileState } from "../file-atoms";
import { atom_recoveryIssue } from "../recovery-atoms";
import type { OpenNotesBackend, OpenNotesChanges, OpenNotesData } from "./open-notes-db";
import { LEGACY_KEY, OpenNotesPersister } from "./open-notes-persister";

type OpenFiles = Record<string, FileState>;

const note = (content: string, extra: Partial<FileState> = {}): FileState => ({
  content,
  lastSavedContent: content,
  fileName: "Note.md",
  activeFilePath: "Note.md",
  ...extra,
});

function memoryBackend(data: OpenNotesData = { texts: {}, snapshots: {} }) {
  const writes: OpenNotesChanges[] = [];
  let fail: unknown = null;
  const backend: OpenNotesBackend = {
    load: vi.fn(async () => data),
    write: vi.fn(async (changes: OpenNotesChanges) => {
      if (fail) throw fail;
      writes.push(changes);
    }),
  };
  return { backend, writes, failWith: (err: unknown) => { fail = err; } };
}

function fakeLegacy(value: OpenFiles | null = null) {
  let stored = value;
  return {
    getItem: vi.fn(() => stored),
    setItem: vi.fn((_key: string, next: OpenFiles | null) => { stored = next; }),
    removeItem: vi.fn(() => { stored = null; }),
    current: () => stored,
  };
}

function fakeMeta(initial: string | null = null) {
  let raw = initial;
  return { get: () => raw, set: vi.fn((value: string) => { raw = value; }), current: () => raw };
}

const make = (backend: OpenNotesBackend | null, legacy = fakeLegacy(), meta = fakeMeta()) => ({
  persister: new OpenNotesPersister(backend, legacy as never, meta),
  legacy,
  meta,
});

// Settles the write delay, then the backend's promise.
async function settle() {
  await vi.advanceTimersByTimeAsync(2000);
}

beforeEach(() => {
  vi.useFakeTimers();
  getDefaultStore().set(atom_recoveryIssue, null);
});
afterEach(() => vi.useRealTimers());

describe("OpenNotesPersister", () => {
  it("keeps everything in localStorage when IndexedDB isn't there", async () => {
    const legacy = fakeLegacy({ "a.md": note("A") });
    const { persister } = make(null, legacy);
    expect(persister.start().files).toEqual({ "a.md": note("A") });
    const next = { "a.md": note("A!") };
    persister.change(next);
    expect(legacy.setItem).toHaveBeenCalledWith(LEGACY_KEY, next);
  });

  it("moves the old localStorage value into IndexedDB once, then removes it", async () => {
    const { backend, writes } = memoryBackend();
    const legacy = fakeLegacy({ "a.md": note("A", { snapshots: [{ timestamp: 1, type: "local", content: "old" }] }) });
    const { persister, meta } = make(backend, legacy);
    expect(persister.start().files?.["a.md"].content).toBe("A");
    await settle();
    expect(writes[0].texts).toEqual({ "a.md": { content: "A" } });
    expect(writes[0].snapshots["a.md"]).toHaveLength(1);
    expect(legacy.removeItem).toHaveBeenCalledWith(LEGACY_KEY);
    expect(JSON.parse(meta.current()!)).toEqual({ "a.md": { fileName: "Note.md", activeFilePath: "Note.md" } });
  });

  it("shows the notes' names at once and their text when it arrives", async () => {
    const { backend } = memoryBackend({ texts: { "a.md": { content: "A", lastSavedContent: "saved" } }, snapshots: {} });
    const { persister } = make(backend, fakeLegacy(), fakeMeta(JSON.stringify({ "a.md": { fileName: "Note.md", activeFilePath: "Note.md", lastModified: 5 } })));
    const { files, load } = persister.start();
    expect(files?.["a.md"]).toMatchObject({ content: "", fileName: "Note.md", lastModified: 5 });
    expect(persister.isReady()).toBe(false);
    const loaded = await load!;
    expect(loaded?.["a.md"]).toMatchObject({ content: "A", lastSavedContent: "saved", lastModified: 5 });
  });

  it("writes only the note that changed, after a pause, one copy of a clean note's text", async () => {
    const { backend, writes } = memoryBackend();
    const { persister } = make(backend);
    persister.start();
    const files = { "a.md": note("A"), "b.md": note("B") };
    persister.change(files);
    await settle();
    writes.length = 0;

    persister.change({ ...files, "a.md": { ...files["a.md"], content: "A1" } });
    persister.change({ ...files, "a.md": { ...files["a.md"], content: "A12" } });
    expect(writes).toHaveLength(0);
    await settle();
    expect(writes).toEqual([{ texts: { "a.md": { content: "A12", lastSavedContent: "A" } }, snapshots: {} }]);

    persister.change({ ...files, "a.md": { ...files["a.md"], content: "A12", lastSavedContent: "A12" } });
    await settle();
    expect(writes[1].texts).toEqual({ "a.md": { content: "A12" } });
  });

  it("writes a note's snapshots apart from its text", async () => {
    const { backend, writes } = memoryBackend();
    const { persister } = make(backend);
    persister.start();
    const files = { "a.md": note("A") };
    persister.change(files);
    await settle();
    writes.length = 0;
    persister.change({ "a.md": { ...files["a.md"], snapshots: [{ timestamp: 1, type: "local", content: "x" }] } });
    await settle();
    expect(writes).toEqual([{ texts: {}, snapshots: { "a.md": [{ timestamp: 1, type: "local", content: "x" }] } }]);
  });

  it("deletes a closed note's records and drops it from the names", async () => {
    const { backend, writes } = memoryBackend();
    const { persister, meta } = make(backend);
    persister.start();
    persister.change({ "a.md": note("A"), "b.md": note("B") });
    await settle();
    persister.change({ "a.md": note("A") });
    await settle();
    expect(writes.at(-1)).toEqual({ texts: { "b.md": null }, snapshots: { "b.md": null } });
    expect(Object.keys(JSON.parse(meta.current()!))).toEqual(["a.md"]);
  });

  it("writes at once on flush (page hidden or closed)", async () => {
    const { backend, writes } = memoryBackend();
    const { persister } = make(backend);
    persister.start();
    persister.change({ "a.md": note("A") });
    persister.flush();
    await Promise.resolve();
    expect(writes).toHaveLength(1);
  });

  it("holds writes until the stored text arrived, then writes the notes changed meanwhile", async () => {
    const { backend, writes } = memoryBackend({ texts: { "a.md": { content: "A" }, "b.md": { content: "B" } }, snapshots: {} });
    const metaValue = { "a.md": { fileName: "a.md", activeFilePath: "a.md" }, "b.md": { fileName: "b.md", activeFilePath: "b.md" } };
    const { persister } = make(backend, fakeLegacy(), fakeMeta(JSON.stringify(metaValue)));
    const { files, load } = persister.start();
    persister.change({ ...files!, "b.md": { ...files!["b.md"], content: "typed early" } });
    await settle();
    expect(writes).toHaveLength(0);

    const loaded = (await load)!;
    persister.hydrated({ "a.md": loaded["a.md"], "b.md": { ...files!["b.md"], content: "typed early" } }, ["b.md"]);
    await settle();
    expect(writes).toEqual([{ texts: { "b.md": { content: "typed early", lastSavedContent: "" } }, snapshots: { "b.md": null } }]);
    await expect(persister.whenReady()).resolves.toBeUndefined();
  });

  it("reports full storage and writes the note again with the next change", async () => {
    const { backend, writes, failWith } = memoryBackend();
    const { persister } = make(backend);
    persister.start();
    failWith(Object.assign(new Error("full"), { name: "QuotaExceededError" }));
    persister.change({ "a.md": note("A"), "b.md": note("B") });
    await settle();
    expect(getDefaultStore().get(atom_recoveryIssue)).toEqual({ kind: "storage-full" });

    failWith(null);
    persister.change({ "a.md": note("A"), "b.md": note("B2") });
    await settle();
    expect(Object.keys(writes.at(-1)!.texts).sort()).toEqual(["a.md", "b.md"]);
    expect(getDefaultStore().get(atom_recoveryIssue)).toBeNull();
  });

  it("falls back to localStorage when an IndexedDB write fails for another reason", async () => {
    const { backend, failWith } = memoryBackend();
    const legacy = fakeLegacy();
    const { persister } = make(backend, legacy);
    persister.start();
    failWith(new Error("blocked"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const files = { "a.md": note("A") };
    persister.change(files);
    await settle();
    expect(legacy.current()).toEqual(files);
    persister.change({ "a.md": note("A2") });
    expect(legacy.current()).toEqual({ "a.md": note("A2") });
  });
});
