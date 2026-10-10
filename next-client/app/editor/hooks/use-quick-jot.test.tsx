import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_openFiles, type FileState } from "@/app/atoms/file-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import { atom_jotTimePrefix } from "@/app/atoms/ui-atoms";
import { useQuickJot } from "./use-quick-jot";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const ensureTodayNote = vi.fn();
const indexVaultTags = vi.fn(async () => {});
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ ensureTodayNote, indexVaultTags }),
}));
const saveFile = vi.fn();
vi.mock("@/app/hooks/file-system/use-save-file", () => ({ useSaveFile: () => ({ saveFile }) }));

const PATH = "journal/2026-10-10.md";
const NOW = new Date(2026, 9, 10, 14, 20);

// A file handle whose disk text and timestamp the test controls; saveFile
// writes through to it like the real one.
function fakeSheet(text: string, lastModified = 100) {
  const disk = { text, lastModified };
  const handle = { getFile: async () => ({ text: async () => disk.text, lastModified: disk.lastModified }) };
  return { disk, sheet: { path: PATH, handle } };
}

function setup({ openState }: { openState?: FileState } = {}) {
  const store = createStore();
  if (openState) {
    store.set(atom_openFiles, { draft: { content: "", lastSavedContent: "", fileName: "untitled", activeFilePath: null }, [PATH]: openState });
    store.set(atom_workspaceLayout, {
      rootContainer: { id: "p", type: "editor", openFilePaths: ["draft", PATH], activeFilePath: "draft", isPinned: false },
    });
  }
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const { result } = renderHook(() => useQuickJot(), { wrapper });
  return { store, result };
}

const tab = (content: string, lastSavedContent = content, lastModified = 100): FileState => ({
  content,
  lastSavedContent,
  fileName: "2026-10-10",
  activeFilePath: PATH,
  lastModified,
});

describe("useQuickJot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("appends to the file on disk when the sheet isn't open, without opening a tab", async () => {
    const { disk, sheet } = fakeSheet("# Saturday\n\n");
    ensureTodayNote.mockResolvedValue(sheet);
    saveFile.mockResolvedValue(true);
    const { store, result } = setup();
    const before = store.get(atom_openFiles);
    let outcome: unknown;
    await act(async () => { outcome = await result.current.addJot("deploy done"); });
    expect(outcome).toEqual({ result: "added", sheetName: "2026-10-10" });
    expect(saveFile).toHaveBeenCalledWith("# Saturday\n\n- deploy done\n", sheet.handle, 0, true, PATH);
    expect(store.get(atom_openFiles)).toBe(before);
    expect(indexVaultTags).toHaveBeenCalled();
    expect(disk.text).toBe("# Saturday\n\n");
  });

  it("updates and saves the buffer of an open, clean sheet", async () => {
    const { sheet } = fakeSheet("notes\n");
    ensureTodayNote.mockResolvedValue(sheet);
    saveFile.mockResolvedValue(true);
    const { store, result } = setup({ openState: tab("notes\n") });
    await act(async () => { await result.current.addJot("- [ ] call back"); });
    expect(store.get(atom_openFiles)[PATH].content).toBe("notes\n- [ ] call back\n");
    expect(saveFile).toHaveBeenCalledWith("notes\n- [ ] call back\n", sheet.handle, 0, true, PATH);
  });

  it("keeps unsaved edits on an unchanged disk file and saves them with the jot", async () => {
    const { sheet } = fakeSheet("notes\n");
    ensureTodayNote.mockResolvedValue(sheet);
    saveFile.mockResolvedValue(true);
    const { store, result } = setup({ openState: tab("notes\nunsaved", "notes\n") });
    await act(async () => { await result.current.addJot("a"); });
    expect(store.get(atom_openFiles)[PATH].content).toBe("notes\nunsaved\n- a\n");
    expect(saveFile).toHaveBeenCalledWith("notes\nunsaved\n- a\n", sheet.handle, 0, true, PATH);
  });

  it("lets disk win under a dirty tab and keeps the unsaved text as a snapshot", async () => {
    const { sheet } = fakeSheet("changed elsewhere\n", 200);
    ensureTodayNote.mockResolvedValue(sheet);
    saveFile.mockResolvedValue(true);
    const { store, result } = setup({ openState: tab("notes\nunsaved", "notes\n") });
    await act(async () => { await result.current.addJot("a"); });
    const state = store.get(atom_openFiles)[PATH];
    expect(state.content).toBe("changed elsewhere\n- a\n");
    expect(state.snapshots).toEqual([expect.objectContaining({ type: "local", content: "notes\nunsaved" })]);
    expect(saveFile).toHaveBeenCalledWith("changed elsewhere\n- a\n", sheet.handle, 0, true, PATH);
  });

  it("is cancelled with no save when the sheet can't be had (prompt cancelled)", async () => {
    ensureTodayNote.mockResolvedValue(null);
    const { result } = setup();
    let outcome: unknown;
    await act(async () => { outcome = await result.current.addJot("a"); });
    expect(outcome).toEqual({ result: "cancelled" });
    expect(saveFile).not.toHaveBeenCalled();
  });

  it("is cancelled without touching the sheet for blank text", async () => {
    const { result } = setup();
    let outcome: unknown;
    await act(async () => { outcome = await result.current.addJot("   "); });
    expect(outcome).toEqual({ result: "cancelled" });
    expect(ensureTodayNote).not.toHaveBeenCalled();
  });

  it("reports whether a failed jot is already in an open buffer", async () => {
    saveFile.mockResolvedValue(false);
    ensureTodayNote.mockResolvedValue(fakeSheet("x\n").sheet);
    const closed = setup();
    let outcome: unknown;
    await act(async () => { outcome = await closed.result.current.addJot("a"); });
    expect(outcome).toEqual({ result: "failed", keptInBuffer: false });

    ensureTodayNote.mockResolvedValue(fakeSheet("x\n").sheet);
    const open = setup({ openState: tab("x\n") });
    await act(async () => { outcome = await open.result.current.addJot("a"); });
    expect(outcome).toEqual({ result: "failed", keptInBuffer: true });
  });

  it("runs jots one at a time, so both lines land in order", async () => {
    const { disk, sheet } = fakeSheet("# Day\n");
    ensureTodayNote.mockResolvedValue(sheet);
    saveFile.mockImplementation(async (content: string) => {
      await Promise.resolve();
      disk.text = content;
      return true;
    });
    const { result } = setup();
    await act(async () => {
      await Promise.all([result.current.addJot("one"), result.current.addJot("two")]);
    });
    expect(disk.text).toBe("# Day\n- one\n- two\n");
  });

  it("starts the line with the time when Time on Quick Jots is on", async () => {
    localStorage.setItem("hermes_jot_time_prefix", "true");
    const { sheet } = fakeSheet("");
    ensureTodayNote.mockResolvedValue(sheet);
    saveFile.mockResolvedValue(true);
    const { store, result } = setup();
    act(() => store.set(atom_jotTimePrefix, true));
    await act(async () => { await result.current.addJot("deploy done"); });
    expect(saveFile).toHaveBeenCalledWith("- 14:20 deploy done\n", sheet.handle, 0, true, PATH);
  });
});
