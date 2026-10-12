import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import toast from "react-hot-toast";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_todayFolder } from "@/app/atoms/ui-atoms";
import { atom_templates } from "@/app/atoms/template-atoms";
import { usePeriodSheets } from "./use-period-sheets";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const openFile = vi.fn(async () => {});
const writeNewNote = vi.fn();
const resolveSheetFolder = vi.fn();
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ openFile, writeNewNote, resolveSheetFolder }),
}));
const askPrompts = vi.fn();
vi.mock("@/app/hooks/use-template-dialog", () => ({ useTemplateDialog: () => ({ askPrompts }) }));

const notFound = () => Object.assign(new Error("missing"), { name: "NotFoundError" });

class FakeFile {
  kind = "file" as const;
  constructor(public name: string, public content = "") {}
  async getFile() {
    const content = this.content;
    return { text: async () => content, lastModified: 1 };
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
    const [head, ...rest] = path.split("/");
    if (rest.length === 0) {
      const file = new FakeFile(head, content);
      this.files.set(head, file);
      return file;
    }
    if (!this.dirs.has(head)) this.dirs.set(head, new FakeDir(head));
    return this.dirs.get(head)!.put(rest.join("/"), content);
  }
}

const meta = (path: string) => ({ path, name: path.split("/").pop()!, frontmatter: {}, tasks: [] }) as unknown as FileMetadata;

// `files` are written to the vault and indexed; `templates` are paths among them.
function setup({ files = {}, templates = [] }: { files?: Record<string, string>; templates?: string[] } = {}) {
  const root = new FakeDir("vault");
  const metadata: Record<string, FileMetadata> = {};
  const handles: Record<string, FakeFile> = {};
  for (const [path, content] of Object.entries(files)) {
    handles[path] = root.put(path, content);
    metadata[path] = meta(path);
  }
  const store = createStore();
  store.set(atom_vaultHandle, root as unknown as FileSystemDirectoryHandle);
  store.set(atom_fileMetadata, metadata);
  store.set(atom_todayFolder, "journal/{{year}}/{{month}}");
  store.set(atom_templates, templates.map((path) => ({ name: path.split("/").pop()!.replace(/\.md$/, ""), path })));
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const { result } = renderHook(() => usePeriodSheets(), { wrapper });
  return { handles, sheets: result.current };
}

const ymd = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];
const written = () => writeNewNote.mock.calls[0][2] as { text: string; cursor: number | null };

describe("usePeriodSheets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 9, 9, 0)); // Fri Oct 9 2026, week 41
    resolveSheetFolder.mockImplementation(async (date: Date) => `journal/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`);
    writeNewNote.mockImplementation(async (folder: string, baseName: string) => ({ path: `${folder}/${baseName}.md`, handle: {} }));
  });
  afterEach(() => vi.useRealTimers());

  it("opens an existing sheet as is, wherever it is", async () => {
    const { handles, sheets } = setup({ files: { "reviews/2026-W41.md": "# mine" } });
    await act(() => sheets.openPeriodSheet({ kind: "week", offset: 0 }));
    expect(openFile).toHaveBeenCalledWith(handles["reviews/2026-W41.md"], "reviews/2026-W41.md", true);
    expect(writeNewNote).not.toHaveBeenCalled();
    expect(handles["reviews/2026-W41.md"].content).toBe("# mine");
  });

  it("creates a new week's sheet as a heading in its Thursday's folder", async () => {
    const { sheets } = setup();
    await act(() => sheets.openPeriodSheet({ kind: "week", offset: 0 }));
    const [date, title] = resolveSheetFolder.mock.calls[0];
    expect(ymd(date)).toEqual([2026, 10, 8]);
    expect(title).toBe("Weekly sheet");
    expect(writeNewNote).toHaveBeenCalledWith("journal/2026/10", "2026-W41", expect.anything(), { unique: false, open: true });
    const { text, cursor } = written();
    expect(text).toMatch(/^# Week 41 · .+\n\n$/);
    expect(cursor).toBe(text.length);
  });

  it("writes nothing when the folder prompt is cancelled", async () => {
    resolveSheetFolder.mockResolvedValue(null);
    const { sheets } = setup();
    await act(() => sheets.openPeriodSheet({ kind: "week", offset: 0 }));
    expect(writeNewNote).not.toHaveBeenCalled();
  });

  it("targets the week that just ended for Last week on a Monday", async () => {
    vi.setSystemTime(new Date(2026, 9, 12, 8, 0));
    const { sheets } = setup();
    await act(() => sheets.openPeriodSheet({ kind: "week", offset: -1 }));
    expect(writeNewNote.mock.calls[0][1]).toBe("2026-W41");
  });

  it("uses the Weekly template, with period links and the caret at {{cursor}}", async () => {
    const template = "---\ntype: weekly\n---\n# {{periodHeading}}\n\n## Focus\n- [ ] {{cursor}}\n\n← [[{{previousPeriod}}]] · [[{{nextPeriod}}]] →\n";
    const { sheets } = setup({ files: { "templates/Weekly.md": template }, templates: ["templates/Weekly.md"] });
    await act(() => sheets.openPeriodSheet({ kind: "week", offset: 0 }));
    const { text, cursor } = written();
    expect(text).toMatch(/^---\ntype: weekly\n---\n# Week 41 · .+\n\n## Focus\n- \[ \] \n\n← \[\[2026-W40\]\] · \[\[2026-W42\]\] →\n$/);
    expect(text.slice(0, cursor!).endsWith("- [ ] ")).toBe(true);
  });

  it("dates a template by the period, not today", async () => {
    vi.setSystemTime(new Date(2026, 10, 1, 8, 0)); // Nov 1: Last month is October
    const { sheets } = setup({ files: { "templates/Monthly.md": "# {{monthName}} · {{monthSheet}}\n" }, templates: ["templates/Monthly.md"] });
    await act(() => sheets.openPeriodSheet({ kind: "month", offset: -1 }));
    expect(written().text).toBe("# October · 2026-10\n");
  });

  it("falls back to a heading when the template can't be read", async () => {
    const { sheets } = setup({ templates: ["templates/Weekly.md"] });
    await act(() => sheets.openPeriodSheet({ kind: "week", offset: 0 }));
    expect(written().text).toMatch(/^# Week 41 · /);
    expect(toast.error).toHaveBeenCalledWith("Couldn't read template Weekly");
  });

  it("writes nothing when the template's questions are cancelled", async () => {
    askPrompts.mockResolvedValue(null);
    const { sheets } = setup({ files: { "templates/Weekly.md": "Goal: {{prompt:Goal}}\n" }, templates: ["templates/Weekly.md"] });
    await act(() => sheets.openPeriodSheet({ kind: "week", offset: 0 }));
    expect(askPrompts).toHaveBeenCalled();
    expect(writeNewNote).not.toHaveBeenCalled();
  });
});
