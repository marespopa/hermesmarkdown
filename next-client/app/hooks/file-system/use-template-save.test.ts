import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import toast from "react-hot-toast";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { writeFileContent } from "@/app/services/file-writer";
import { useTemplateSave } from "./use-template-save";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/app/services/file-writer", () => ({
  writeFileContent: vi.fn(async (handle: FakeFile, content: string) => { handle.content = content; }),
}));
const dialog = { confirm: vi.fn(), prompt: vi.fn() };
vi.mock("@/app/hooks/use-dialog", () => ({ useDialog: () => dialog }));

const notFound = () => Object.assign(new Error("missing"), { name: "NotFoundError" });

class FakeFile {
  kind = "file" as const;
  constructor(public name: string, public content = "") {}
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
}

const meta = (path: string) => ({ path, name: path.split("/").pop()! }) as FileMetadata;

function setup(existing: Record<string, string> = {}) {
  const root = new FakeDir("vault");
  const templates = new FakeDir("templates");
  root.dirs.set("templates", templates);
  for (const [name, content] of Object.entries(existing)) templates.files.set(name, new FakeFile(name, content));
  const store = createStore();
  store.set(atom_vaultHandle, root as unknown as FileSystemDirectoryHandle);
  store.set(atom_fileMetadata, Object.fromEntries(
    ["notes/a.md", ...Object.keys(existing).map((n) => `templates/${n}`)].map((p) => [p, meta(p)]),
  ));
  const scanVault = vi.fn(async () => {});
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const { result } = renderHook(() => useTemplateSave({ scanVault }), { wrapper });
  return { templates, scanVault, save: result.current };
}

describe("useTemplateSave", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves the note's text as <templates folder>/<name>.md, name prefilled", async () => {
    dialog.prompt.mockResolvedValue("Weekly sync");
    const { templates, scanVault, save } = setup();
    await act(async () => { expect(await save("# Sync\n{{date}}\n", "Sync")).toBe(true); });
    expect(dialog.prompt).toHaveBeenCalledWith("Template name:", "Sync", "Save as template");
    expect(templates.files.get("Weekly sync.md")?.content).toBe("# Sync\n{{date}}\n");
    expect(scanVault).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Saved template: templates/Weekly sync.md");
  });

  it("asks before replacing a template of the same name (any case)", async () => {
    dialog.prompt.mockResolvedValue("sync");
    dialog.confirm.mockResolvedValue(false);
    const { templates, save } = setup({ "Sync.md": "old" });
    await act(async () => { expect(await save("new", "")).toBe(false); });
    expect(dialog.confirm).toHaveBeenCalled();
    expect(templates.files.get("Sync.md")?.content).toBe("old");

    dialog.confirm.mockResolvedValue(true);
    await act(async () => { expect(await save("new", "")).toBe(true); });
    expect(templates.files.get("Sync.md")?.content).toBe("new");
  });

  it("does nothing when the name prompt is cancelled", async () => {
    dialog.prompt.mockResolvedValue(null);
    const { save } = setup();
    await act(async () => { expect(await save("x", "")).toBe(false); });
    expect(writeFileContent).not.toHaveBeenCalled();
  });
});
