import { afterEach, describe, expect, it, vi } from "vitest";
import { changesFileList, createFileObserver, isFileObserverSupported, observeVault, type FileSystemChangeRecord } from "./file-observer";

type Callback = (records: { type: string; root: unknown; changedHandle: unknown }[]) => void;

class MockObserver {
  static instances: MockObserver[] = [];
  callback: Callback;
  observe = vi.fn(() => Promise.resolve());
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(callback: Callback) {
    this.callback = callback;
    MockObserver.instances.push(this);
  }
}

const handle = (name: string) => ({ kind: "file", name }) as unknown as FileSystemFileHandle;

describe("file-observer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    MockObserver.instances = [];
  });

  it("returns null when FileSystemObserver is unavailable", () => {
    vi.stubGlobal("FileSystemObserver", undefined);
    expect(isFileObserverSupported()).toBe(false);
    expect(createFileObserver(() => {})).toBeNull();
  });

  it("observes new handles and unobserves removed or replaced ones", () => {
    vi.stubGlobal("FileSystemObserver", MockObserver);
    const fo = createFileObserver(() => {})!;
    const mock = MockObserver.instances[0];
    const a = handle("a.md");
    const b = handle("b.md");

    fo.sync(new Map([["a.md", a], ["b.md", b]]));
    expect(mock.observe).toHaveBeenCalledTimes(2);

    // Unchanged handles aren't re-observed
    fo.sync(new Map([["a.md", a], ["b.md", b]]));
    expect(mock.observe).toHaveBeenCalledTimes(2);

    const a2 = handle("a.md");
    fo.sync(new Map([["a.md", a2]]));
    expect(mock.unobserve).toHaveBeenCalledWith(a);
    expect(mock.unobserve).toHaveBeenCalledWith(b);
    expect(mock.observe).toHaveBeenLastCalledWith(a2);
  });

  it("calls onChange for change records and re-observes errored handles", () => {
    vi.stubGlobal("FileSystemObserver", MockObserver);
    const onChange = vi.fn();
    const fo = createFileObserver(onChange)!;
    const mock = MockObserver.instances[0];
    const a = handle("a.md");

    fo.sync(new Map([["a.md", a]]));
    mock.callback([{ type: "modified", root: a, changedHandle: a }]);
    expect(onChange).toHaveBeenCalledTimes(1);

    mock.callback([{ type: "errored", root: a, changedHandle: null }]);
    fo.sync(new Map([["a.md", a]]));
    expect(mock.observe).toHaveBeenCalledTimes(2);
  });

  it("forgets handles whose observe() rejects so a later sync retries", async () => {
    vi.stubGlobal("FileSystemObserver", MockObserver);
    const fo = createFileObserver(() => {})!;
    const mock = MockObserver.instances[0];
    mock.observe.mockImplementationOnce(() => Promise.reject(new Error("denied")));
    const a = handle("a.md");

    fo.sync(new Map([["a.md", a]]));
    await Promise.resolve();
    await Promise.resolve();
    fo.sync(new Map([["a.md", a]]));
    expect(mock.observe).toHaveBeenCalledTimes(2);
  });

  it("disconnects and ignores later syncs", () => {
    vi.stubGlobal("FileSystemObserver", MockObserver);
    const fo = createFileObserver(() => {})!;
    const mock = MockObserver.instances[0];

    fo.disconnect();
    fo.sync(new Map([["a.md", handle("a.md")]]));
    expect(mock.disconnect).toHaveBeenCalled();
    expect(mock.observe).not.toHaveBeenCalled();
  });
});

describe("changesFileList / observeVault", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    MockObserver.instances = [];
  });

  const record = (type: FileSystemChangeRecord["type"], path: string[]) =>
    ({ type, relativePathComponents: path, root: null, changedHandle: null }) as unknown as FileSystemChangeRecord;

  it("counts files appearing, going away or moving, not edits or hidden folders", () => {
    expect(changesFileList(record("appeared", ["notes", "a.md"]))).toBe(true);
    expect(changesFileList(record("disappeared", ["a.md"]))).toBe(true);
    expect(changesFileList(record("moved", ["b.md"]))).toBe(true);
    expect(changesFileList(record("unknown", []))).toBe(true);
    expect(changesFileList(record("modified", ["a.md"]))).toBe(false);
    expect(changesFileList(record("errored", ["a.md"]))).toBe(false);
    expect(changesFileList(record("appeared", [".hermesmarkdown", "trash", "a.md"]))).toBe(false);
  });

  it("watches the vault recursively and reports file-list changes only", async () => {
    vi.stubGlobal("FileSystemObserver", MockObserver);
    const onChange = vi.fn();
    const root = { kind: "directory", name: "vault" } as unknown as FileSystemDirectoryHandle;
    const stop = await observeVault(root, onChange);
    const mock = MockObserver.instances[0];
    expect(mock.observe).toHaveBeenCalledWith(root, { recursive: true });

    mock.callback([record("modified", ["a.md"])] as never);
    expect(onChange).not.toHaveBeenCalled();
    mock.callback([record("modified", ["a.md"]), record("appeared", ["b.md"])] as never);
    expect(onChange).toHaveBeenCalledTimes(1);

    stop!();
    expect(mock.disconnect).toHaveBeenCalled();
  });

  it("returns null without FileSystemObserver", async () => {
    vi.stubGlobal("FileSystemObserver", undefined);
    expect(await observeVault({} as FileSystemDirectoryHandle, () => {})).toBeNull();
  });
});
