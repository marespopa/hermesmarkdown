import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import toast from "react-hot-toast";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { BUILTIN_PACKS } from "@/app/utils/templates/template-packs";
import { sanitizePackName, useTemplatePacks } from "./use-template-packs";

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/app/services/file-writer", () => ({
  writeFileContent: vi.fn(async (handle: FakeFile, content: string) => { handle.content = content; }),
}));
const dialog = { confirm: vi.fn(), prompt: vi.fn() };
vi.mock("@/app/hooks/use-dialog", () => ({ useDialog: () => dialog }));
const fileSystem = { scanVault: vi.fn(async () => {}), indexVaultTags: vi.fn(async () => {}), trashItems: vi.fn(async () => {}) };
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => fileSystem }));

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
  at(path: string): FakeFile | undefined {
    const parts = path.split("/");
    const dir = parts.slice(0, -1).reduce<FakeDir | undefined>((current, part) => current?.dirs.get(part), this);
    return dir?.files.get(parts[parts.length - 1]);
  }
  async put(path: string, content: string) {
    const parts = path.split("/");
    const dir = await parts
      .slice(0, -1)
      .reduce<Promise<FakeDir>>(async (current, part) => (await current).getDirectoryHandle(part, { create: true }), Promise.resolve(this));
    (await dir.getFileHandle(parts[parts.length - 1], { create: true })).content = content;
  }
}

async function setup(files: Record<string, string> = {}) {
  const root = new FakeDir("vault");
  for (const [path, content] of Object.entries(files)) await root.put(path, content);
  const store = createStore();
  store.set(atom_vaultHandle, root as unknown as FileSystemDirectoryHandle);
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const { result } = renderHook(() => useTemplatePacks(), { wrapper });
  return { root, packs: result.current };
}

const journal = BUILTIN_PACKS.find((pack) => pack.name === "Journal")!;

describe("sanitizePackName", () => {
  it("keeps one plain folder name", () => {
    expect(sanitizePackName(" Work/Notes ")).toBe("Work-Notes");
    expect(sanitizePackName("..hidden")).toBe("hidden");
    expect(sanitizePackName("  ")).toBe("");
  });
});

describe("useTemplatePacks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds a built-in pack into the templates folder, keeping files you already have", async () => {
    const { root, packs } = await setup({ "templates/Journal/Daily.md": "mine\n" });
    let written = 0;
    await act(async () => { written = await packs.addBuiltinPack(journal); });
    expect(written).toBe(journal.templates.length - 1);
    expect(root.at("templates/Journal/Daily.md")?.content).toBe("mine\n");
    expect(root.at("templates/Journal/Weekly.md")?.content).toBe(journal.templates.find((t) => t.name === "Weekly")!.body);
    expect(fileSystem.scanVault).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Added Journal"));
  });

  it("joins an add already in progress for the same pack instead of writing it twice", async () => {
    const { packs } = await setup();
    const { writeFileContent } = await import("@/app/services/file-writer");
    let first = 0;
    let second = 0;
    await act(async () => {
      [first, second] = await Promise.all([packs.addBuiltinPack(journal), packs.addBuiltinPack(journal)]);
    });
    expect(first).toBe(journal.templates.length);
    expect(second).toBe(first);
    expect(writeFileContent).toHaveBeenCalledTimes(journal.templates.length);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("creates an empty pack folder, refusing a name that's taken", async () => {
    const { root, packs } = await setup({ "templates/Work/a.md": "a\n" });
    dialog.prompt.mockResolvedValueOnce("Writing");
    await act(async () => { await packs.createPack(); });
    expect(root.dirs.get("templates")!.dirs.has("Writing")).toBe(true);

    dialog.prompt.mockResolvedValueOnce("Work");
    let name: string | null = "x";
    await act(async () => { name = await packs.createPack(); });
    expect(name).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("There's already a pack named Work");
  });

  it("duplicates a pack's templates as saved", async () => {
    const { root, packs } = await setup({ "templates/Journal/Daily.md": "# {{date}}\n" });
    dialog.prompt.mockResolvedValueOnce("Diary");
    const pack = { name: "Journal", folder: "templates/Journal", templates: [{ name: "Daily", path: "templates/Journal/Daily.md", pack: "Journal" }] };
    await act(async () => { await packs.duplicatePack(pack); });
    expect(dialog.prompt).toHaveBeenCalledWith("Pack name:", "Journal copy", "Duplicate pack");
    expect(root.at("templates/Diary/Daily.md")?.content).toBe("# {{date}}\n");
  });

  it("moves a pack to the Trash only after asking", async () => {
    const { packs } = await setup({ "templates/Journal/Daily.md": "x\n" });
    const pack = { name: "Journal", folder: "templates/Journal", templates: [] };
    dialog.confirm.mockResolvedValueOnce(false);
    await act(async () => { await packs.deletePack(pack); });
    expect(fileSystem.trashItems).not.toHaveBeenCalled();

    dialog.confirm.mockResolvedValueOnce(true);
    await act(async () => { await packs.deletePack(pack); });
    expect(fileSystem.trashItems).toHaveBeenCalledWith([expect.objectContaining({ path: "templates/Journal" })]);
  });

  it("moves one template to the Trash only after asking", async () => {
    const { packs } = await setup({ "templates/Meeting.md": "x\n" });
    const template = { name: "Meeting", path: "templates/Meeting.md" };
    dialog.confirm.mockResolvedValueOnce(false);
    await act(async () => { await packs.deleteTemplate(template); });
    expect(fileSystem.trashItems).not.toHaveBeenCalled();

    dialog.confirm.mockResolvedValueOnce(true);
    await act(async () => { await packs.deleteTemplate(template); });
    expect(dialog.confirm).toHaveBeenCalledWith("Move the Meeting template to the Trash?", "Delete template", "Delete", "Cancel");
    expect(fileSystem.trashItems).toHaveBeenCalledWith([expect.objectContaining({ path: "templates/Meeting.md" })]);
  });
});
