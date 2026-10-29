import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
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

describe("sanitizePackName", () => {
  it("keeps one plain folder name", () => {
    expect(sanitizePackName(" Work/Notes ")).toBe("Work-Notes");
    expect(sanitizePackName("..hidden")).toBe("hidden");
    expect(sanitizePackName("  ")).toBe("");
  });
});

describe("useTemplatePacks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("duplicates a pack's templates as saved", async () => {
    const { root, packs } = await setup({ "_templates/Journal/Daily.md": "# {{date}}\n" });
    dialog.prompt.mockResolvedValueOnce("Diary");
    const pack = { name: "Journal", folder: "_templates/Journal", templates: [{ name: "Daily", path: "_templates/Journal/Daily.md", pack: "Journal" }] };
    await act(async () => { await packs.duplicatePack(pack); });
    expect(dialog.prompt).toHaveBeenCalledWith("Pack name:", "Journal copy", "Duplicate pack");
    expect(root.at("_templates/Diary/Daily.md")?.content).toBe("# {{date}}\n");
  });

  it("moves a pack to the Trash only after asking", async () => {
    const { packs } = await setup({ "_templates/Journal/Daily.md": "x\n" });
    const pack = { name: "Journal", folder: "_templates/Journal", templates: [] };
    dialog.confirm.mockResolvedValueOnce(false);
    await act(async () => { await packs.deletePack(pack); });
    expect(fileSystem.trashItems).not.toHaveBeenCalled();

    dialog.confirm.mockResolvedValueOnce(true);
    await act(async () => { await packs.deletePack(pack); });
    expect(fileSystem.trashItems).toHaveBeenCalledWith([expect.objectContaining({ path: "_templates/Journal" })]);
  });

  it("moves one template to the Trash only after asking", async () => {
    const { packs } = await setup({ "_templates/Meeting.md": "x\n" });
    const template = { name: "Meeting", path: "_templates/Meeting.md" };
    dialog.confirm.mockResolvedValueOnce(false);
    await act(async () => { await packs.deleteTemplate(template); });
    expect(fileSystem.trashItems).not.toHaveBeenCalled();

    dialog.confirm.mockResolvedValueOnce(true);
    await act(async () => { await packs.deleteTemplate(template); });
    expect(dialog.confirm).toHaveBeenCalledWith("Move the Meeting template to the Trash?", "Delete template", "Delete", "Cancel");
    expect(fileSystem.trashItems).toHaveBeenCalledWith([expect.objectContaining({ path: "_templates/Meeting.md" })]);
  });

  it("moves a folder template's whole folder to the Trash only after asking", async () => {
    const { packs } = await setup({ "_templates/{{Research topic}}/README.md": "---\nscaffold: true\n---\n" });
    const template = { name: "{{Research topic}}", folder: "_templates/{{Research topic}}", readmePath: "_templates/{{Research topic}}/README.md" };
    dialog.confirm.mockResolvedValueOnce(false);
    await act(async () => { await packs.deleteFolderTemplate(template); });
    expect(fileSystem.trashItems).not.toHaveBeenCalled();

    dialog.confirm.mockResolvedValueOnce(true);
    await act(async () => { await packs.deleteFolderTemplate(template); });
    expect(dialog.confirm).toHaveBeenCalledWith("Move the Research topic folder template to the Trash?", "Delete folder template", "Delete", "Cancel");
    expect(fileSystem.trashItems).toHaveBeenCalledWith([expect.objectContaining({ path: "_templates/{{Research topic}}" })]);
  });
});
