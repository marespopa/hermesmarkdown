import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import toast from "react-hot-toast";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_newNoteFolder, atom_pendingScrollTarget } from "@/app/atoms/ui-atoms";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { writeFileContent } from "@/app/services/file-writer";
import { NEW_TEMPLATE_BODY, namesItsNote, useTemplateCreate } from "./use-template-create";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/app/services/file-writer", () => ({
  writeFileContent: vi.fn(async (handle: FakeFile, content: string) => { handle.content = content; }),
}));
const dialog = { confirm: vi.fn(), prompt: vi.fn() };
vi.mock("@/app/hooks/use-dialog", () => ({ useDialog: () => dialog }));
const pickTemplate = vi.fn();
const askPrompts = vi.fn();
vi.mock("@/app/hooks/use-template-dialog", () => ({ useTemplateDialog: () => ({ pickTemplate, askPrompts }) }));

const notFound = () => Object.assign(new Error("missing"), { name: "NotFoundError" });

class FakeFile {
  kind = "file" as const;
  constructor(public name: string, public content = "") {}
  async getFile() {
    const content = this.content;
    return { text: async () => content };
  }
}

class FakeDir {
  kind = "directory" as const;
  dirs = new Map<string, FakeDir>();
  files = new Map<string, FakeFile>();
  constructor(public name: string) {}
  async getDirectoryHandle(name: string, { create = false } = {}) {
    if (!this.dirs.has(name)) {
      if (!create) throw notFound();
      this.dirs.set(name, new FakeDir(name));
    }
    return this.dirs.get(name)!;
  }
  async getFileHandle(name: string, { create = false } = {}) {
    if (!this.files.has(name)) {
      if (!create) throw notFound();
      this.files.set(name, new FakeFile(name));
    }
    return this.files.get(name)!;
  }
  // Test helper: the file at a vault path, or undefined.
  at(path: string): FakeFile | undefined {
    const parts = path.split("/");
    const dir = parts
      .slice(0, -1)
      .reduce<FakeDir | undefined>((current, part) => current?.dirs.get(part), this);
    return dir?.files.get(parts[parts.length - 1]);
  }
  async put(path: string, content: string) {
    const parts = path.split("/");
    const dir = await parts
      .slice(0, -1)
      .reduce<Promise<FakeDir>>(
        async (current, part) => (await current).getDirectoryHandle(part, { create: true }),
        Promise.resolve(this),
      );
    (await dir.getFileHandle(parts[parts.length - 1], { create: true })).content = content;
  }
}

// Its target_folder is a leftover from older templates: ignored, and kept out of notes.
const RFC_TEMPLATE =
  "---\ntarget_folder: docs/rfcs\nfile_name: rfc-{{date}}-{{slug}}\n---\n# {{title}}\nOwner: {{prompt:Owner}}\n{{cursor}}\n";

const meta = (path: string) => ({ path, name: path.split("/").pop()! }) as FileMetadata;

async function setup({ templates = { "templates/rfc.md": RFC_TEMPLATE } as Record<string, string>, newNoteFolder = "" } = {}) {
  const root = new FakeDir("vault");
  const metadata: Record<string, FileMetadata> = {};
  for (const [path, content] of Object.entries(templates)) {
    await root.put(path, content);
    metadata[path] = meta(path);
  }
  const store = createStore();
  store.set(atom_vaultHandle, root as unknown as FileSystemDirectoryHandle);
  store.set(atom_fileMetadata, metadata);
  store.set(atom_newNoteFolder, newNoteFolder);
  const props = { scanVault: vi.fn(async () => {}), indexVaultTags: vi.fn(async () => {}), openFile: vi.fn(async () => {}) };
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const { result } = renderHook(() => useTemplateCreate(props), { wrapper });
  return { root, store, props, flows: result.current };
}

describe("createNoteFromMissingLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    dialog.confirm.mockResolvedValue(true);
    askPrompts.mockResolvedValue({ Owner: "Ana" });
  });

  it("preselects the template the link's folder points to, then creates the note at the link's path", async () => {
    pickTemplate.mockResolvedValue({ name: "rfc", path: "templates/rfc.md" });
    const { root, store, props, flows } = await setup();
    await act(() => flows.createNoteFromMissingLink("rfcs/auth-spec"));

    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(pickTemplate).toHaveBeenCalledWith({
      includeBlank: true,
      title: "New note: rfcs/auth-spec",
      preselect: { name: "rfc", path: "templates/rfc.md" },
    });
    expect(askPrompts).toHaveBeenCalledWith(["Owner"], "Create");
    const created = root.at("rfcs/auth-spec.md");
    // Routing keys ignored and removed; the link named the note and decided the path.
    expect(created?.content).toBe("# auth-spec\nOwner: Ana\n\n");
    expect(root.dirs.has("docs")).toBe(false);
    expect(props.scanVault).toHaveBeenCalled();
    expect(props.openFile).toHaveBeenCalledWith(created, "rfcs/auth-spec.md", true);
    expect(store.get(atom_pendingScrollTarget)).toEqual({ path: "rfcs/auth-spec.md", line: 3, column: 0 });
    expect(toast.success).toHaveBeenCalledWith("Created: rfcs/auth-spec.md");
  });

  it("writes Blank note even when a template was suggested", async () => {
    pickTemplate.mockResolvedValue("blank");
    const { root, flows } = await setup();
    await act(() => flows.createNoteFromMissingLink("rfcs/auth-spec"));
    expect(root.at("rfcs/auth-spec.md")?.content).toBe("\n");
  });

  it("opens the picker with Blank note and nothing preselected when no template matches", async () => {
    pickTemplate.mockResolvedValue("blank");
    const { root, flows } = await setup();
    await act(() => flows.createNoteFromMissingLink("ideas/x"));
    expect(pickTemplate).toHaveBeenCalledWith(expect.objectContaining({ includeBlank: true, preselect: null }));
    expect(root.at("ideas/x.md")?.content).toBe("\n");
  });

  it("writes nothing when the picker is dismissed", async () => {
    pickTemplate.mockResolvedValue(null);
    const { root, flows } = await setup();
    await act(() => flows.createNoteFromMissingLink("ideas/x"));
    expect(root.dirs.has("ideas")).toBe(false);
  });

  it("still offers the picker (Blank note only) in a vault without templates", async () => {
    pickTemplate.mockResolvedValue("blank");
    const { root, flows } = await setup({ templates: {} });
    await act(() => flows.createNoteFromMissingLink("rfcs/a"));
    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(pickTemplate).toHaveBeenCalledWith(expect.objectContaining({ includeBlank: true }));
    expect(root.at("rfcs/a.md")?.content).toBe("\n");
  });

  it("creates a folderless link in the New Notes Folder", async () => {
    pickTemplate.mockResolvedValue("blank");
    const { root, props, flows } = await setup({ newNoteFolder: "inbox" });
    await act(() => flows.createNoteFromMissingLink("idea|My idea"));
    expect(root.at("inbox/idea.md")?.content).toBe("\n");
    expect(props.openFile).toHaveBeenCalledWith(root.at("inbox/idea.md"), "inbox/idea.md", true);
  });

  it("opens a file that exists on disk without writing it", async () => {
    const { root, props, flows } = await setup();
    await root.put("rfcs/auth-spec.md", "keep me");
    await act(() => flows.createNoteFromMissingLink("rfcs/auth-spec"));
    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(writeFileContent).not.toHaveBeenCalled();
    expect(root.at("rfcs/auth-spec.md")?.content).toBe("keep me");
    expect(props.openFile).toHaveBeenCalledWith(root.at("rfcs/auth-spec.md"), "rfcs/auth-spec.md", true);
  });

  it("shows a toast for an invalid name and writes nothing", async () => {
    const { flows } = await setup();
    await act(() => flows.createNoteFromMissingLink("bad:name"));
    expect(toast.error).toHaveBeenCalledWith('Can\'t create a note named "bad:name"');
    expect(writeFileContent).not.toHaveBeenCalled();
  });

  it("writes nothing when the prompts are cancelled", async () => {
    askPrompts.mockResolvedValue(null);
    pickTemplate.mockResolvedValue({ name: "rfc", path: "templates/rfc.md" });
    const { root, flows } = await setup();
    await act(() => flows.createNoteFromMissingLink("rfcs/auth-spec"));
    expect(root.dirs.has("rfcs")).toBe(false);
  });
});

describe("createNoteFromTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 4, 9, 0));
    pickTemplate.mockResolvedValue({ name: "rfc", path: "templates/rfc.md" });
    dialog.prompt.mockResolvedValue("Auth Spec");
    askPrompts.mockResolvedValue({ Owner: "Ana" });
  });
  afterEach(() => vi.useRealTimers());

  it("puts the note in the New Notes Folder named by file_name, ignoring target_folder", async () => {
    const { root, flows } = await setup({ newNoteFolder: "inbox" });
    await act(() => flows.createNoteFromTemplate());
    expect(pickTemplate).toHaveBeenCalledWith(expect.objectContaining({ includeBlank: false }));
    expect(root.at("inbox/rfc-2026-10-04-auth-spec.md")?.content).toBe("# Auth Spec\nOwner: Ana\n\n");
    expect(root.dirs.has("docs")).toBe(false);
  });

  it("opens a note of the same name as it is: never ` (1)`, never overwritten", async () => {
    const { root, props, flows } = await setup({ templates: { "templates/rfc.md": "Body {{title}}\n" }, newNoteFolder: "inbox" });
    await root.put("inbox/Auth Spec.md", "mine");
    await act(() => flows.createNoteFromTemplate());
    expect(writeFileContent).not.toHaveBeenCalled();
    expect(root.at("inbox/Auth Spec.md")?.content).toBe("mine");
    expect(root.at("inbox/Auth Spec (1).md")).toBeUndefined();
    expect(props.openFile).toHaveBeenCalledWith(root.at("inbox/Auth Spec.md"), "inbox/Auth Spec.md", true);
  });

  it("names a weekly note by its date format", async () => {
    const weekly = "---\nfile_name: {{date:GGGG-[W]ww}}\n---\n# Week {{date:ww}}\n";
    const { root, flows } = await setup({ templates: { "templates/Weekly.md": weekly } });
    await act(() => flows.createNoteFromTemplate({ name: "Weekly", path: "templates/Weekly.md" }));
    expect(dialog.prompt).not.toHaveBeenCalled();
    expect(root.at("2026-W40.md")?.content).toBe("# Week 40\n");
  });

  it("falls back to the New Notes Folder and the title", async () => {
    const { root, flows } = await setup({ templates: { "templates/rfc.md": "Body {{title}}\n" }, newNoteFolder: "inbox" });
    await act(() => flows.createNoteFromTemplate());
    expect(root.at("inbox/Auth Spec.md")?.content).toBe("Body Auth Spec\n");
  });

  it("names a dated note without asking for a title, and opens it again instead of duplicating", async () => {
    const daily = "---\nfile_name: {{date}}\n---\n# {{title}}\n{{cursor}}\n";
    const { root, props, flows } = await setup({ templates: { "templates/Journal/Daily.md": daily } });
    const entry = { name: "Daily", path: "templates/Journal/Daily.md", pack: "Journal" };
    await act(() => flows.createNoteFromTemplate(entry, "journal"));
    expect(pickTemplate).not.toHaveBeenCalled();
    expect(dialog.prompt).not.toHaveBeenCalled();
    expect(root.at("journal/2026-10-04.md")?.content).toBe("# 2026-10-04\n\n");

    root.at("journal/2026-10-04.md")!.content = "# 2026-10-04\nWritten today\n";
    props.openFile.mockClear();
    await act(() => flows.createNoteFromTemplate(entry, "journal"));
    expect(root.at("journal/2026-10-04.md")?.content).toBe("# 2026-10-04\nWritten today\n");
    expect(root.at("journal/2026-10-04 (1).md")).toBeUndefined();
    expect(props.openFile).toHaveBeenCalledWith(expect.anything(), "journal/2026-10-04.md", true);
  });

  it("puts the note in the folder it was asked from", async () => {
    const { root, flows } = await setup();
    await act(() => flows.createNoteFromTemplate(undefined, "projects/auth"));
    expect(root.at("projects/auth/rfc-2026-10-04-auth-spec.md")?.content).toBe("# Auth Spec\nOwner: Ana\n\n");
    expect(root.at("docs/rfcs/rfc-2026-10-04-auth-spec.md")).toBeUndefined();
  });

  it("cancels on an empty title", async () => {
    dialog.prompt.mockResolvedValue("  ");
    const { flows } = await setup();
    await act(() => flows.createNoteFromTemplate());
    expect(askPrompts).not.toHaveBeenCalled();
    expect(writeFileContent).not.toHaveBeenCalled();
  });
});

describe("namesItsNote", () => {
  it("is true for a file_name that doesn't come from the title", () => {
    expect(namesItsNote("{{date}}")).toBe(true);
    expect(namesItsNote("{{weekSheet}}")).toBe(true);
    expect(namesItsNote("{{prompt:Client}} notes")).toBe(true);
    expect(namesItsNote("rfc-{{date}}-{{slug}}")).toBe(false);
    expect(namesItsNote("{{title}}")).toBe(false);
    expect(namesItsNote(undefined)).toBe(false);
    expect(namesItsNote("  ")).toBe(false);
  });
});

describe("createTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    dialog.prompt.mockResolvedValue("Meeting");
  });

  it("asks the name, then creates templates/<name>.md with a minimal body and opens it", async () => {
    const { root, props, flows } = await setup({ templates: {} });
    await act(() => flows.createTemplate());
    expect(dialog.prompt).toHaveBeenCalledWith("Template name:", "", "New template");
    const created = root.at("templates/Meeting.md");
    expect(created?.content).toBe(NEW_TEMPLATE_BODY);
    expect(NEW_TEMPLATE_BODY).toBe("# {{title}}\n\n{{cursor}}\n");
    expect(props.scanVault).toHaveBeenCalled();
    expect(props.openFile).toHaveBeenCalledWith(created, "templates/Meeting.md", true);
    expect(toast.success).toHaveBeenCalledWith("Created: templates/Meeting.md");
  });

  it("creates it inside a pack when given one, apart from a loose template of the same name", async () => {
    const { root, flows } = await setup({ templates: { "templates/Meeting.md": "loose\n" } });
    await act(() => flows.createTemplate("Work"));
    expect(root.at("templates/Work/Meeting.md")?.content).toBe(NEW_TEMPLATE_BODY);
    expect(root.at("templates/Meeting.md")?.content).toBe("loose\n");
  });

  it("always uses templates/ at the vault root, even when _templates exists", async () => {
    const { root, flows } = await setup({ templates: { "_templates/x.md": "x\n" } });
    await act(() => flows.createTemplate());
    expect(root.at("templates/Meeting.md")?.content).toBe(NEW_TEMPLATE_BODY);
    expect(root.at("_templates/Meeting.md")).toBeUndefined();
  });

  it("keeps the base name only and never writes a dot-file", async () => {
    dialog.prompt.mockResolvedValue("../evil/.Rfc.md");
    const { root, flows } = await setup({ templates: {} });
    await act(() => flows.createTemplate());
    expect(root.at("templates/Rfc.md")?.content).toBe(NEW_TEMPLATE_BODY);
    expect(root.dirs.has("evil")).toBe(false);
  });

  it("opens an existing file on disk unchanged", async () => {
    dialog.prompt.mockResolvedValue("rfc");
    const { root, props, flows } = await setup();
    await act(() => flows.createTemplate());
    expect(writeFileContent).not.toHaveBeenCalled();
    expect(root.at("templates/rfc.md")?.content).toBe(RFC_TEMPLATE);
    expect(props.openFile).toHaveBeenCalledWith(root.at("templates/rfc.md"), "templates/rfc.md", true);
    expect(toast.success).toHaveBeenCalledWith("Opened existing template: templates/rfc.md");
  });

  it("opens a not-yet-indexed file on disk unchanged", async () => {
    dialog.prompt.mockResolvedValue("draft");
    const { root, props, flows } = await setup();
    await root.put("templates/draft.md", "keep me");
    await act(() => flows.createTemplate());
    expect(writeFileContent).not.toHaveBeenCalled();
    expect(props.openFile).toHaveBeenCalledWith(root.at("templates/draft.md"), "templates/draft.md", true);
    expect(toast.success).toHaveBeenCalledWith("Opened existing template: templates/draft.md");
  });

  it("matches an indexed template case-insensitively", async () => {
    dialog.prompt.mockResolvedValue("RFC");
    const { root, props, flows } = await setup();
    await act(() => flows.createTemplate());
    expect(writeFileContent).not.toHaveBeenCalled();
    expect(root.at("templates/RFC.md")).toBeUndefined();
    expect(props.openFile).toHaveBeenCalledWith(root.at("templates/rfc.md"), "templates/rfc.md", true);
  });

  it.each([null, "   "])("writes and opens nothing for a %j name", async (answer) => {
    dialog.prompt.mockResolvedValue(answer);
    const { root, props, flows } = await setup({ templates: {} });
    await act(() => flows.createTemplate());
    expect(writeFileContent).not.toHaveBeenCalled();
    expect(props.openFile).not.toHaveBeenCalled();
    expect(root.dirs.has("templates")).toBe(false);
  });

  it("doesn't prompt without a vault", async () => {
    const { store, flows } = await setup({ templates: {} });
    store.set(atom_vaultHandle, null);
    await act(() => flows.createTemplate());
    expect(dialog.prompt).not.toHaveBeenCalled();
  });

  it("reports a failed write", async () => {
    vi.mocked(writeFileContent).mockRejectedValueOnce(new Error("disk full"));
    const { props, flows } = await setup({ templates: {} });
    await act(() => flows.createTemplate());
    expect(toast.error).toHaveBeenCalledWith("Failed to create file");
    expect(props.openFile).not.toHaveBeenCalled();
  });
});

describe("{{clipboard}}", () => {
  const readText = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    pickTemplate.mockResolvedValue({ name: "clip", path: "templates/clip.md" });
    dialog.prompt.mockResolvedValue("Note");
    Object.defineProperty(navigator, "clipboard", { value: { readText }, configurable: true });
  });

  it("inserts the clipboard text", async () => {
    readText.mockResolvedValue("pasted");
    const { root, flows } = await setup({ templates: { "templates/clip.md": "> {{clipboard}}\n" } });
    await act(() => flows.createNoteFromTemplate());
    expect(root.at("Note.md")?.content).toBe("> pasted\n");
  });

  it("is empty when the read is denied", async () => {
    readText.mockRejectedValue(new Error("denied"));
    const { root, flows } = await setup({ templates: { "templates/clip.md": "> {{clipboard}}\n" } });
    await act(() => flows.createNoteFromTemplate());
    expect(root.at("Note.md")?.content).toBe("> \n");
  });

  it("isn't read for templates that don't use it", async () => {
    const { flows } = await setup({ templates: { "templates/clip.md": "plain\n" } });
    await act(() => flows.createNoteFromTemplate());
    expect(readText).not.toHaveBeenCalled();
  });
});

describe("createLinkedNoteFromTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    askPrompts.mockResolvedValue({ Owner: "Ana" });
  });
  const rfc = { name: "rfc", path: "templates/rfc.md" };

  it("creates the note in the New Notes Folder and returns its link path, without opening it", async () => {
    const { root, props, flows } = await setup({ newNoteFolder: "inbox" });
    let path: string | null = null;
    await act(async () => { path = await flows.createLinkedNoteFromTemplate("Auth", rfc); });
    expect(path).toBe("inbox/Auth");
    expect(root.at("inbox/Auth.md")?.content).toBe("# Auth\nOwner: Ana\n\n");
    expect(props.openFile).not.toHaveBeenCalled();
    expect(props.scanVault).toHaveBeenCalled();
  });

  it("uses the folder in the name", async () => {
    const { root, flows } = await setup();
    let path: string | null = null;
    await act(async () => { path = await flows.createLinkedNoteFromTemplate("specs/Auth", rfc); });
    expect(path).toBe("specs/Auth");
    expect(root.at("specs/Auth.md")).toBeDefined();
  });

  it("creates nothing when the questions are cancelled", async () => {
    askPrompts.mockResolvedValue(null);
    const { flows } = await setup();
    let path: string | null = "x";
    await act(async () => { path = await flows.createLinkedNoteFromTemplate("Auth", rfc); });
    expect(path).toBeNull();
    expect(writeFileContent).not.toHaveBeenCalled();
  });

  it("links an existing note as it is, without asking or writing", async () => {
    const { root, flows } = await setup({ newNoteFolder: "inbox" });
    await root.put("inbox/Auth.md", "mine");
    let path: string | null = null;
    await act(async () => { path = await flows.createLinkedNoteFromTemplate("Auth", rfc); });
    expect(path).toBe("inbox/Auth");
    expect(askPrompts).not.toHaveBeenCalled();
    expect(writeFileContent).not.toHaveBeenCalled();
    expect(root.at("inbox/Auth.md")?.content).toBe("mine");
    expect(root.at("inbox/Auth (1).md")).toBeUndefined();
  });
});

describe("createWikiLinkFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("creates a blank note in the New Notes Folder without asking for a folder", async () => {
    const { root, props, flows } = await setup({ newNoteFolder: "inbox" });
    let path: string | null = null;
    await act(async () => { path = await flows.createWikiLinkFile("Idea"); });
    expect(path).toBe("inbox/Idea");
    expect(root.at("inbox/Idea.md")?.content).toBe("\n");
    expect(dialog.prompt).not.toHaveBeenCalled();
    expect(props.openFile).not.toHaveBeenCalled();
  });

  it("uses the folder in the name and links an existing note as it is", async () => {
    const { root, flows } = await setup();
    await root.put("ideas/Idea.md", "mine");
    let path: string | null = null;
    await act(async () => { path = await flows.createWikiLinkFile("ideas/Idea"); });
    expect(path).toBe("ideas/Idea");
    expect(writeFileContent).not.toHaveBeenCalled();
    expect(root.at("ideas/Idea.md")?.content).toBe("mine");
  });
});
