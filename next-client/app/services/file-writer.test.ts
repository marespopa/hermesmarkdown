import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryFileHandle } from "./memory-file-system.test-utils";

// Stand-in for opfs-writer.worker.ts: records requests and answers with the
// configured outcome on the next tick.
const posted: { id: number; path: string[]; bytes: Uint8Array }[] = [];
let failWith: { name: string; message: string } | null = null;

class WriterWorkerMock {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage(request: { id: number; path: string[]; bytes: Uint8Array }) {
    posted.push(request);
    setTimeout(() => {
      this.onmessage?.({
        data: failWith ? { id: request.id, ok: false, ...failWith } : { id: request.id, ok: true },
      } as MessageEvent);
    }, 0);
  }
}

const originalWorker = globalThis.Worker;
const originalStorage = Object.getOwnPropertyDescriptor(navigator, "storage");

beforeEach(() => {
  posted.length = 0;
  failWith = null;
  Object.defineProperty(globalThis, "Worker", { value: WriterWorkerMock, configurable: true });
});

afterEach(() => {
  Object.defineProperty(globalThis, "Worker", { value: originalWorker, configurable: true });
  if (originalStorage) Object.defineProperty(navigator, "storage", originalStorage);
  else delete (navigator as any).storage;
});

function stubStorageRoot(resolve: (handle: unknown) => string[] | null) {
  Object.defineProperty(navigator, "storage", {
    value: { getDirectory: vi.fn(async () => ({ resolve: vi.fn(async (handle: unknown) => resolve(handle)) })) },
    configurable: true,
  });
}

describe("writeFileContent", () => {
  it("writes through createWritable when the handle has it", async () => {
    const { writeFileContent } = await import("./file-writer");
    const handle = new MemoryFileHandle("note.md");

    await writeFileContent(handle as unknown as FileSystemFileHandle, "# Hello");

    expect(handle.text()).toBe("# Hello");
    expect(posted).toHaveLength(0);
  });

  it("closes the stream even when the write fails", async () => {
    const { writeFileContent } = await import("./file-writer");
    const close = vi.fn(async () => undefined);
    const handle = {
      createWritable: vi.fn(async () => ({
        write: vi.fn(async () => { throw new DOMException("locked", "NoModificationAllowedError"); }),
        close,
      })),
    };

    await expect(writeFileContent(handle as unknown as FileSystemFileHandle, "x"))
      .rejects.toMatchObject({ name: "NoModificationAllowedError" });
    expect(close).toHaveBeenCalledOnce();
  });

  it("falls back to the worker with the file's storage path when createWritable is missing", async () => {
    const { writeFileContent } = await import("./file-writer");
    const handle = { kind: "file", name: "a.md" };
    stubStorageRoot((candidate) => (candidate === handle ? ["hermes-vaults", "browser-x", "a.md"] : null));

    await writeFileContent(handle as unknown as FileSystemFileHandle, "hi");

    expect(posted).toHaveLength(1);
    expect(posted[0].path).toEqual(["hermes-vaults", "browser-x", "a.md"]);
    expect(new TextDecoder().decode(posted[0].bytes)).toBe("hi");
  });

  it("does not detach the caller's buffer when handing bytes to the worker", async () => {
    const { writeFileContent } = await import("./file-writer");
    stubStorageRoot(() => ["hermes-vaults", "browser-x", "pic.png"]);
    const bytes = new Uint8Array([1, 2, 3]);

    await writeFileContent({ kind: "file" } as unknown as FileSystemFileHandle, bytes);

    expect(Array.from(bytes)).toEqual([1, 2, 3]);
    expect(Array.from(posted[0].bytes)).toEqual([1, 2, 3]);
  });

  it("surfaces worker errors with their name", async () => {
    const { writeFileContent } = await import("./file-writer");
    stubStorageRoot(() => ["hermes-vaults", "browser-x", "a.md"]);
    failWith = { name: "QuotaExceededError", message: "Storage is full" };

    await expect(writeFileContent({ kind: "file" } as unknown as FileSystemFileHandle, "hi"))
      .rejects.toMatchObject({ name: "QuotaExceededError", message: "Storage is full" });
  });

  it("refuses files outside browser storage when createWritable is missing", async () => {
    const { writeFileContent } = await import("./file-writer");
    stubStorageRoot(() => null);

    await expect(writeFileContent({ kind: "file" } as unknown as FileSystemFileHandle, "hi"))
      .rejects.toThrow("This browser cannot write to this file.");
    expect(posted).toHaveLength(0);
  });
});
