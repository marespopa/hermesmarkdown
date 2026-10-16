import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_homeFeedOpen } from "@/app/atoms/ui-atoms";
import { useHomeFeed } from "./use-home-feed";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
vi.mock("@/app/components/CommandPalette/CommandPaletteContext", () => ({
  useCommandPalette: () => ({ open: vi.fn(), isOpen: false, setCreateNote: vi.fn() }),
  useRegisterCommand: vi.fn(),
}));
vi.mock("./use-home-feed-url", () => ({ useHomeFeedUrlSync: vi.fn() }));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

describe("useHomeFeed, opening a note", () => {
  it("keeps the feed up until the note has been opened", async () => {
    const store = createStore();
    const handle = { kind: "file", name: "note.md" } as unknown as FileSystemFileHandle;
    store.set(atom_fileMetadata, { "note.md": { path: "note.md", name: "note.md", handle } } as any);
    store.set(atom_homeFeedOpen, true);
    const reading = deferred();
    // Like the real openFile: the feed closes once the note is read.
    const openFile = vi.fn(async () => {
      await reading.promise;
      store.set(atom_homeFeedOpen, false);
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
    const { result } = renderHook(() => useHomeFeed({
      hasVault: true,
      openFile,
      newNote: vi.fn(async () => {}),
      materializeDraft: vi.fn(async () => null),
      importFile: vi.fn(async () => {}),
    }), { wrapper });

    act(() => result.current.feedProps.onOpenNote("note.md"));
    await vi.waitFor(() => expect(openFile).toHaveBeenCalledWith(handle, "note.md"));
    // Still reading: no empty pane in between.
    expect(store.get(atom_homeFeedOpen)).toBe(true);

    await act(async () => { reading.resolve(); });
    expect(store.get(atom_homeFeedOpen)).toBe(false);
  });
});
