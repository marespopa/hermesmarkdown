import { renderHook, waitFor } from "@testing-library/react";
import { useIndexActiveFile } from "./use-index-active-file";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useAtomValue, useSetAtom } from "jotai";
import { metadataWorker } from "./shared";
import {
  atom_vaultHandle,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_content,
  atom_indexerState,
  atom_fileLastModified,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";

// Mock Jotai
vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useAtomValue: vi.fn(),
    useSetAtom: vi.fn(),
  };
});

// Mock Shared (Worker)
vi.mock("./shared", () => ({
  metadataWorker: {
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
}));

describe("useIndexActiveFile", () => {
  const mockSetIndexerState = vi.fn();
  const mockSetFileMetadata = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useSetAtom as any).mockImplementation((atom: any) => {
      if (atom === atom_indexerState) return mockSetIndexerState;
      if (atom === atom_fileMetadata) return mockSetFileMetadata;
      return vi.fn();
    });
  });

  it("should trigger indexing when content changes", async () => {
    const mockFileHandle = {
      name: "test.md",
      getFile: vi.fn(),
    };

    (useAtomValue as any).mockImplementation((atom: any) => {
      if (atom === atom_vaultHandle) return { name: "vault" };
      if (atom === atom_activeFileHandle) return mockFileHandle;
      if (atom === atom_activeFilePath) return "test.md";
      if (atom === atom_content) return "# Test Content";
      if (atom === atom_fileLastModified) return 123456;
      return null;
    });

    renderHook(() => useIndexActiveFile());

    await waitFor(() => {
      expect(metadataWorker?.postMessage).toHaveBeenCalledWith({
        files: [{
          path: "test.md",
          name: "test.md",
          content: "# Test Content",
          modifiedAt: expect.any(Number),
        }],
      });
    }, { timeout: 2000 });

    // Verify getFile was NOT called (optimization)
    expect(mockFileHandle.getFile).not.toHaveBeenCalled();
    expect(mockSetIndexerState).toHaveBeenCalledWith("compiling");
  });

  it("should update metadata when worker responds", async () => {
    let messageCallback: any;
    (metadataWorker?.addEventListener as any).mockImplementation((type: string, cb: any) => {
      if (type === "message") messageCallback = cb;
    });

    const mockFileHandle = { name: "test.md" };
    (useAtomValue as any).mockImplementation((atom: any) => {
      if (atom === atom_vaultHandle) return { name: "vault" };
      if (atom === atom_activeFileHandle) return mockFileHandle;
      if (atom === atom_activeFilePath) return "test.md";
      if (atom === atom_content) return "# Test Content";
      if (atom === atom_fileLastModified) return 123456;
      return null;
    });

    renderHook(() => useIndexActiveFile());

    // Simulate worker response
    const mockResult = {
      path: "test.md",
      tags: ["#test"],
      links: [],
      modifiedAt: Date.now(),
    };

    expect(messageCallback).toBeDefined();
    messageCallback({ data: { results: [mockResult] } });

    expect(mockSetFileMetadata).toHaveBeenCalled();
    const updateFn = mockSetFileMetadata.mock.calls[0][0];
    const newState = updateFn({ "test.md": { modifiedAt: 0, handle: mockFileHandle } });
    
    expect(newState["test.md"].tags).toContain("#test");
    expect(newState["test.md"].handle).toBe(mockFileHandle);
    expect(mockSetIndexerState).toHaveBeenCalledWith("idle");
  });
});
