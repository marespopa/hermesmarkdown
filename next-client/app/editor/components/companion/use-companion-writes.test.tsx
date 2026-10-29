import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_vaultHandle, type FileUndoStep } from "@/app/atoms/vault-atoms";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { useCompanionWrites } from "./use-companion-writes";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/services/file-writer", () => ({
  writeFileContent: async (handle: { createWritable: () => Promise<{ write: (d: string) => Promise<void>; close: () => Promise<void> }> }, text: string) => {
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
  },
}));
vi.mock("@/app/hooks/file-system/use-note-buffer", () => ({ useNoteBuffer: () => ({ writeThrough: vi.fn(), readCurrentText: vi.fn() }) }));
// The turn's undo group, as the app's file-undo stack would hold it.
let steps: FileUndoStep[] = [];
const recordSteps = vi.fn((_ref: { id: string }, update: (s: FileUndoStep[]) => FileUndoStep[]) => {
  steps = update(steps);
  return null;
});
const scanVault = vi.fn(async () => {});
const indexVaultTags = vi.fn(async () => {});
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ scanVault, indexVaultTags, recordSteps, undoFileOperation: vi.fn() }),
}));

async function setup() {
  const vault = new MemoryDirectoryHandle("vault");
  await vault.writeText("Projects/Roadmap.md", "# Roadmap");
  const store = createStore();
  store.set(atom_vaultHandle, vault.asHandle());
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useCompanionWrites(), { wrapper });
  return { vault, writes: result.current };
}

describe("useCompanionWrites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 27, 9));
    steps = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a note with frontmatter and re-indexes the vault so the file tree shows it", async () => {
    const { vault, writes } = await setup();

    let result = { output: "", detail: "" };
    await act(async () => { result = await writes.createFile("turn-1", "Projects/Launch plan.md", "# Launch\n"); });

    expect(result.output).toBe("Created Projects/Launch plan.md.");
    expect(vault.fileAt("Projects/Launch plan.md")!.text()).toBe('---\ntitle: Launch plan\ncreated: 2026-10-27\n---\n\n# Launch\n');
    expect(scanVault).toHaveBeenCalled();
    expect(indexVaultTags).toHaveBeenCalled();
  });

  it("writes a code file as given", async () => {
    const { vault, writes } = await setup();

    await act(async () => { await writes.createFile("turn-1", "scripts/run.py", "print('hi')\n"); });

    expect(vault.fileAt("scripts/run.py")!.text()).toBe("print('hi')\n");
  });

  it("sends a template's problems back to the model and writes nothing", async () => {
    const { vault, writes } = await setup();

    const result = await writes.createTemplate("turn-1", "RFC", "# {{titl}}\n{{cursor}}\n{{cursor}}");

    expect(result.detail).toBe("needs fixes");
    expect(result.output).toContain("{{titl}} looks like {{title}}");
    expect(result.output).toContain("more than once");
    expect(vault.listPaths()).toEqual(["Projects/Roadmap.md"]);
    expect(steps).toEqual([]);
  });

  it("saves a clean template in _templates/, recording the new folder and file in the turn", async () => {
    const { vault, writes } = await setup();

    let result = { output: "", detail: "" };
    await act(async () => { result = await writes.createTemplate("turn-1", "Meeting notes", "# {{title}}\nWith: {{prompt:Who}}\n"); });

    expect(result.output).toBe("Saved the template _templates/Meeting notes.md. It shows in the template picker.");
    expect(vault.fileAt("_templates/Meeting notes.md")!.text()).toBe("# {{title}}\nWith: {{prompt:Who}}\n");
    expect(steps.map((step) => step.kind)).toEqual(["folder", "create"]);
    expect(recordSteps).toHaveBeenCalledWith({ id: "turn-1", label: "AI changes" }, expect.any(Function));
  });

  it("never replaces a template", async () => {
    const { vault, writes } = await setup();
    await vault.writeText("_templates/RFC.md", "mine");

    const result = await writes.createTemplate("turn-1", "RFC", "# {{title}}");

    expect(result.detail).toBe("exists");
    expect(vault.fileAt("_templates/RFC.md")!.text()).toBe("mine");
  });

  it("creates a folder once, refusing the vault's own data folder", async () => {
    const { writes } = await setup();

    await act(async () => { expect((await writes.createFolder("turn-1", "Archive/2026")).output).toBe("Created the folder Archive/2026."); });
    expect(steps).toEqual([{ kind: "folder", path: "Archive" }, { kind: "folder", path: "Archive/2026" }]);
    expect((await writes.createFolder("turn-1", "Archive/2026")).detail).toBe("exists");
    expect((await writes.createFolder("turn-1", ".hermesmarkdown/x")).detail).toBe("refused");
  });
});
