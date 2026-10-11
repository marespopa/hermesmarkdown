import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import toast from "react-hot-toast";
import { atom_openFiles, type FileState } from "@/app/atoms/file-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_todayFolder } from "@/app/atoms/ui-atoms";
import { ROLLUP_END, ROLLUP_START } from "@/app/utils/rollup/render";
import { MARKERS_MISSING_MESSAGE, useRollups } from "./use-rollups";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const openFile = vi.fn(async () => {});
const writeNewNote = vi.fn();
const resolveSheetFolder = vi.fn();
const indexVaultTags = vi.fn(async () => {});
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ openFile, writeNewNote, resolveSheetFolder, indexVaultTags }),
}));
const saveFile = vi.fn(async (content: string, handle: FakeFile) => {
  handle.content = content;
  handle.lastModified++;
  return true;
});
vi.mock("@/app/hooks/file-system/use-save-file", () => ({ useSaveFile: () => ({ saveFile }) }));

const notFound = () => Object.assign(new Error("missing"), { name: "NotFoundError" });

class FakeFile {
  kind = "file" as const;
  lastModified = 100;
  constructor(public name: string, public content = "") {}
  async getFile() {
    const { content, lastModified } = this;
    return { text: async () => content, lastModified };
  }
}

class FakeDir {
  kind = "directory" as const;
  dirs = new Map<string, FakeDir>();
  files = new Map<string, FakeFile>();
  constructor(public name: string) {}
  async getDirectoryHandle(name: string) {
    if (!this.dirs.has(name)) throw notFound();
    return this.dirs.get(name)!;
  }
  async getFileHandle(name: string) {
    if (!this.files.has(name)) throw notFound();
    return this.files.get(name)!;
  }
  put(path: string, content: string): FakeFile {
    const parts = path.split("/");
    let dir: FakeDir = this;
    for (const part of parts.slice(0, -1)) {
      if (!dir.dirs.has(part)) dir.dirs.set(part, new FakeDir(part));
      dir = dir.dirs.get(part)!;
    }
    const file = new FakeFile(parts[parts.length - 1], content);
    dir.files.set(file.name, file);
    return file;
  }
}

const meta = (path: string, frontmatter: Record<string, unknown> = {}) =>
  ({ path, name: path.split("/").pop()!, frontmatter, tasks: [] }) as unknown as FileMetadata;

// `files` are written to the vault and indexed; `indexedOnly` are indexed but missing on disk.
function setup({ files = {}, indexedOnly = [], openTab }: { files?: Record<string, string>; indexedOnly?: string[]; openTab?: { path: string; state: FileState } } = {}) {
  const root = new FakeDir("vault");
  const metadata: Record<string, FileMetadata> = {};
  const handles: Record<string, FakeFile> = {};
  for (const [path, content] of Object.entries(files)) {
    handles[path] = root.put(path, content);
    metadata[path] = meta(path);
  }
  for (const path of indexedOnly) metadata[path] = meta(path);
  const store = createStore();
  store.set(atom_vaultHandle, root as unknown as FileSystemDirectoryHandle);
  store.set(atom_fileMetadata, metadata);
  store.set(atom_todayFolder, "journal/{{year}}/{{month}}");
  if (openTab) {
    store.set(atom_openFiles, { draft: { content: "", lastSavedContent: "", fileName: "untitled", activeFilePath: null }, [openTab.path]: openTab.state });
    store.set(atom_workspaceLayout, {
      rootContainer: { id: "p", type: "editor", openFilePaths: [openTab.path], activeFilePath: openTab.path, isPinned: false },
    });
  }
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const { result } = renderHook(() => useRollups(), { wrapper });
  return { root, store, handles, rollups: result.current };
}

const ymd = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];
const writtenText = () => writeNewNote.mock.calls[0][2].text as string;

describe("useRollups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 9, 9, 0)); // Fri Oct 9 2026, week 41
    resolveSheetFolder.mockImplementation(async (date: Date) => `journal/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`);
    writeNewNote.mockImplementation(async (folder: string, baseName: string) => ({ path: `${folder}/${baseName}.md`, handle: {} }));
  });
  afterEach(() => vi.useRealTimers());

  describe("openRollup", () => {
    it("opens an existing weekly sheet as is", async () => {
      const { handles, rollups } = setup({ files: { "reviews/2026-W41.md": "# mine" } });
      await act(() => rollups.openRollup({ kind: "week", offset: 0 }));
      expect(openFile).toHaveBeenCalledWith(handles["reviews/2026-W41.md"], "reviews/2026-W41.md", true);
      expect(writeNewNote).not.toHaveBeenCalled();
      expect(resolveSheetFolder).not.toHaveBeenCalled();
      expect(saveFile).not.toHaveBeenCalled();
    });

    it("generates the week's sheet from its daily sheets, anywhere, in the Thursday's folder", async () => {
      const { rollups } = setup({
        files: {
          "journal/2026/10/2026-10-06.md": "- [x] Fix login redirect #bug\n- [ ] Draft roadmap",
          "old/2026-10-08.md": "- [ ] Deploy billing service #blocked",
          "journal/2026/10/2026-10-12.md": "- [ ] Next week's task",
        },
      });
      await act(() => rollups.openRollup({ kind: "week", offset: 0 }));
      const [date, title] = resolveSheetFolder.mock.calls[0];
      expect(ymd(date)).toEqual([2026, 10, 8]);
      expect(title).toBe("Weekly sheet");
      expect(writeNewNote).toHaveBeenCalledWith("journal/2026/10", "2026-W41", expect.objectContaining({ cursor: expect.any(Number) }), { unique: false, open: true });
      const text = writtenText();
      expect(text).toContain("1 done · 1 open · 1 blocked");
      expect(text).toContain("- Fix login redirect · [[2026-10-06]]");
      expect(text).toContain("- Deploy billing service · [[2026-10-08]]");
      expect(text).not.toContain("Next week's task");
      expect(text.endsWith("## Notes\n\n")).toBe(true);
    });

    it("writes nothing when the folder prompt is cancelled", async () => {
      resolveSheetFolder.mockResolvedValue(null);
      const { rollups } = setup();
      await act(() => rollups.openRollup({ kind: "week", offset: 0 }));
      expect(writeNewNote).not.toHaveBeenCalled();
    });

    it("targets the week that just ended for Last week on a Monday", async () => {
      vi.setSystemTime(new Date(2026, 9, 12, 8, 0));
      const { rollups } = setup();
      await act(() => rollups.openRollup({ kind: "week", offset: -1 }));
      expect(writeNewNote.mock.calls[0][1]).toBe("2026-W41");
      expect(writtenText()).toContain("No daily sheets this week");
    });

    it("targets the month that just ended for Last month on the 1st", async () => {
      vi.setSystemTime(new Date(2026, 10, 1, 8, 0));
      const { rollups } = setup();
      await act(() => rollups.openRollup({ kind: "month", offset: -1 }));
      const [date, title] = resolveSheetFolder.mock.calls[0];
      expect(ymd(date)).toEqual([2026, 10, 1]);
      expect(title).toBe("Monthly sheet");
      expect(writeNewNote.mock.calls[0].slice(0, 2)).toEqual(["journal/2026/10", "2026-10"]);
    });

    it("collects the Notes of the month's weekly sheets, leaving out empty ones", async () => {
      const { rollups } = setup({
        files: {
          "journal/2026/10/2026-10-06.md": "- [x] Fix login redirect #bug",
          "journal/2026/10/2026-W41.md": `# Week 41\n\n${ROLLUP_START}\nx\n${ROLLUP_END}\n\n## Notes\n\nShipped the billing beta.\n`,
          "journal/2026/10/2026-W42.md": `# Week 42\n\n${ROLLUP_START}\nx\n${ROLLUP_END}\n\n## Notes\n\n`,
        },
      });
      await act(() => rollups.openRollup({ kind: "month", offset: 0 }));
      const text = writtenText();
      expect(text).toContain("## Weekly notes\n\n### Week 41 · [[2026-W41]]\nShipped the billing beta.");
      expect(text).not.toContain("Week 42 ·");
      expect(text).toContain("> [!success]- #bug · 1");
    });

    it("skips a daily sheet that can't be read and says so", async () => {
      const { rollups } = setup({
        files: { "journal/2026/10/2026-10-06.md": "- [ ] Draft roadmap" },
        indexedOnly: ["journal/2026/10/2026-10-07.md"],
      });
      await act(() => rollups.openRollup({ kind: "week", offset: 0 }));
      expect(writtenText()).toContain("0 done · 1 open · 0 blocked");
      expect(toast.error).toHaveBeenCalledWith("1 daily sheet couldn't be read");
    });

    it("makes the new sheet sensitive when a source sheet is", async () => {
      const { rollups } = setup({ files: { "journal/2026/10/2026-10-06.md": "---\nsensitive: true\n---\n- [ ] Contract renewal" } });
      await act(() => rollups.openRollup({ kind: "week", offset: 0 }));
      expect(writtenText().startsWith("---\nsensitive: true\n---\n\n# Week 41")).toBe(true);
    });
  });

  describe("refreshRollup", () => {
    const SHEET = "journal/2026/10/2026-W41.md";
    const DAY = "journal/2026/10/2026-10-06.md";
    const weekly = (body: string, notes: string) => `# Week 41\n\nAbove the region\n${ROLLUP_START}\n${body}\n${ROLLUP_END}\n\n## Notes\n\n${notes}\n`;

    it("updates an open, dirty sheet's buffer, keeps everything outside the markers and saves", async () => {
      const disk = weekly("stale", "Saved notes");
      const unsaved = weekly("stale", "Saved notes and unsaved ones");
      const { store, rollups } = setup({
        files: { [SHEET]: disk, [DAY]: "- [x] Fix login redirect #bug" },
        openTab: { path: SHEET, state: { content: unsaved, lastSavedContent: disk, fileName: "2026-W41", activeFilePath: SHEET, lastModified: 100 } },
      });
      await act(() => rollups.refreshRollup(SHEET));
      const state = store.get(atom_openFiles)[SHEET];
      expect(state.content.startsWith(`# Week 41\n\nAbove the region\n${ROLLUP_START}\n1 done · 0 open · 0 blocked\n`)).toBe(true);
      expect(state.content).toContain("- Fix login redirect · [[2026-10-06]]");
      expect(state.content.endsWith(`${ROLLUP_END}\n\n## Notes\n\nSaved notes and unsaved ones\n`)).toBe(true);
      expect(state.snapshots).toBeUndefined();
      expect(saveFile).toHaveBeenCalledWith(state.content, expect.anything(), 0, true, SHEET);
      expect(toast.success).toHaveBeenCalledWith("Rollup refreshed", expect.anything());
    });

    it("writes nothing and explains how to rebuild when the markers are gone", async () => {
      const { rollups } = setup({ files: { [SHEET]: "# Week 41\n\n## Notes\n" } });
      await act(() => rollups.refreshRollup(SHEET));
      expect(saveFile).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(MARKERS_MISSING_MESSAGE, expect.anything());
    });

    it("says the rollup is up to date and saves nothing when nothing changed", async () => {
      const { handles, rollups } = setup({ files: { [SHEET]: weekly("stale", "Notes"), [DAY]: "- [ ] Draft roadmap" } });
      await act(() => rollups.refreshRollup(SHEET));
      expect(saveFile).toHaveBeenCalledTimes(1);
      const refreshed = handles[SHEET].content;
      await act(() => rollups.refreshRollup(SHEET));
      expect(saveFile).toHaveBeenCalledTimes(1);
      expect(handles[SHEET].content).toBe(refreshed);
      expect(toast).toHaveBeenCalledWith("Rollup is up to date", expect.anything());
    });

    it("ignores a note that isn't a rollup sheet", async () => {
      const { rollups } = setup({ files: { [DAY]: "- [ ] Draft roadmap" } });
      await act(() => rollups.refreshRollup(DAY));
      expect(saveFile).not.toHaveBeenCalled();
    });
  });
});
