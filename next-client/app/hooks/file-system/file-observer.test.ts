import { afterEach, describe, expect, it, vi } from "vitest";
import { createFileObserver, isFileObserverSupported } from "./file-observer";

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
