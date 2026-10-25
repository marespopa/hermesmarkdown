import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_gitAvailable } from "@/app/atoms/git-atoms";
import { useGitBaseline } from "./use-git-baseline";

const getHead = vi.fn();
const getHeadBlob = vi.fn();
vi.mock("@/app/services/git-read-client", () => ({
  getHead: (...args: unknown[]) => getHead(...args),
  getHeadBlob: (...args: unknown[]) => getHeadBlob(...args),
}));

const dispatch = vi.fn();
const viewRef = { current: { state: { field: () => ({}) }, dispatch } as never };
const vault = {} as FileSystemDirectoryHandle;

function setup(props: { enabled: boolean; filePath: string }) {
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const hook = renderHook((p) => useGitBaseline({ viewRef, vaultHandle: vault, ...p }), { wrapper, initialProps: props });
  return { store, ...hook };
}

const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const baselines = () => dispatch.mock.calls.map((call) => call[0].effects.value);

beforeEach(() => {
  vi.useFakeTimers();
  getHead.mockReset().mockResolvedValue({ available: true, commit: "c1", stamp: "s1" });
  getHeadBlob.mockReset().mockResolvedValue({ status: "ok", text: "head text" });
  dispatch.mockReset();
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useGitBaseline", () => {
  it("dispatches HEAD's text when enabled", async () => {
    setup({ enabled: true, filePath: "a.md" });
    await flush();
    expect(getHeadBlob).toHaveBeenCalledWith(vault, "c1", "a.md");
    expect(baselines()).toEqual([{ text: "head text" }]);
  });

  it("uses a null baseline for a file missing from HEAD or a repo without commits", async () => {
    getHeadBlob.mockResolvedValue({ status: "missing" });
    setup({ enabled: true, filePath: "new.md" });
    await flush();
    expect(baselines()).toEqual([{ text: null }]);

    dispatch.mockReset();
    getHead.mockResolvedValue({ available: true, commit: null, stamp: "s0" });
    setup({ enabled: true, filePath: "new.md" });
    await flush();
    expect(baselines()).toEqual([{ text: null }]);
  });

  it("sets atom_gitAvailable to false and turns the gutter off when there is no repository", async () => {
    getHead.mockResolvedValue({ available: false, commit: null, stamp: "" });
    const { store } = setup({ enabled: true, filePath: "a.md" });
    await flush();
    expect(store.get(atom_gitAvailable)).toBe(false);
    expect(getHeadBlob).not.toHaveBeenCalled();
    expect(baselines()).toEqual(["off"]);
  });

  it("turns the gutter off for a binary blob", async () => {
    getHeadBlob.mockResolvedValue({ status: "binary" });
    setup({ enabled: true, filePath: "a.md" });
    await flush();
    expect(baselines()).toEqual(["off"]);
  });

  it("re-reads on focus only when HEAD's stamp changed", async () => {
    setup({ enabled: true, filePath: "a.md" });
    await flush();
    getHeadBlob.mockClear();

    act(() => { window.dispatchEvent(new Event("focus")); });
    await flush();
    expect(getHeadBlob).not.toHaveBeenCalled();

    getHead.mockResolvedValue({ available: true, commit: "c2", stamp: "s2" });
    getHeadBlob.mockResolvedValue({ status: "ok", text: "newer" });
    act(() => { window.dispatchEvent(new Event("focus")); });
    await flush();
    expect(getHeadBlob).toHaveBeenCalledWith(vault, "c2", "a.md");
    expect(baselines().at(-1)).toEqual({ text: "newer" });
  });

  it("checks every 5 s while the window is focused", async () => {
    setup({ enabled: true, filePath: "a.md" });
    await flush();
    getHead.mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(getHead).toHaveBeenCalledTimes(1);
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(getHead).toHaveBeenCalledTimes(1);
  });

  it("ignores a stale response after the path changed", async () => {
    let release: (value: unknown) => void = () => {};
    getHeadBlob.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const { rerender } = setup({ enabled: true, filePath: "a.md" });
    await flush();
    getHeadBlob.mockResolvedValue({ status: "ok", text: "b text" });
    rerender({ enabled: true, filePath: "b.md" });
    await flush();
    release({ status: "ok", text: "a text" });
    await flush();
    expect(baselines()).toEqual([{ text: "b text" }]);
  });

  it("does nothing when disabled", async () => {
    setup({ enabled: false, filePath: "a.md" });
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(getHead).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
