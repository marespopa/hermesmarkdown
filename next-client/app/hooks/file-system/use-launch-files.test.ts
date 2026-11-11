import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openFile = vi.fn();
const toastError = vi.fn();

vi.mock("./use-open-file", () => ({ useOpenFile: () => ({ openFile }) }));
vi.mock("react-hot-toast", () => ({ default: { error: (m: string) => toastError(m) } }));

import { useLaunchFiles } from "./use-launch-files";

type Consumer = (params: { files?: unknown[] }) => Promise<void>;

const fileHandle = (name: string) => ({ kind: "file", name });

describe("useLaunchFiles", () => {
  let consumer: Consumer | undefined;

  beforeEach(() => {
    consumer = undefined;
    openFile.mockReset().mockResolvedValue(undefined);
    toastError.mockReset();
    (window as unknown as { launchQueue?: unknown }).launchQueue = {
      setConsumer: (fn: Consumer) => { consumer = fn; },
    };
  });

  afterEach(() => {
    delete (window as unknown as { launchQueue?: unknown }).launchQueue;
  });

  it("opens each launched file by name, in order", async () => {
    renderHook(() => useLaunchFiles());
    const a = fileHandle("plan.md");
    const b = fileHandle("notes.md");
    await consumer!({ files: [a, b] });
    expect(openFile.mock.calls).toEqual([[a, "plan.md"], [b, "notes.md"]]);
  });

  it("ignores folders", async () => {
    renderHook(() => useLaunchFiles());
    await consumer!({ files: [{ kind: "directory", name: "docs" }] });
    expect(openFile).not.toHaveBeenCalled();
  });

  it("says so when a file can't be opened and keeps going", async () => {
    openFile.mockRejectedValueOnce(new Error("denied"));
    renderHook(() => useLaunchFiles());
    await consumer!({ files: [fileHandle("a.md"), fileHandle("b.md")] });
    expect(toastError).toHaveBeenCalledWith("Couldn't open a.md");
    expect(openFile).toHaveBeenCalledTimes(2);
  });

  it("does nothing where launchQueue is missing", () => {
    delete (window as unknown as { launchQueue?: unknown }).launchQueue;
    expect(() => renderHook(() => useLaunchFiles())).not.toThrow();
  });
});
