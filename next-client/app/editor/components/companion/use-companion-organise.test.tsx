import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { answerTrash, atom_trashRequests } from "./trash-confirm";
import { useCompanionOrganise } from "./use-companion-organise";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/hooks/file-system/use-note-buffer", () => ({ useNoteBuffer: () => ({ readCurrentText: async () => "# Note" }) }));
const renameFile = vi.fn();
const moveItems = vi.fn();
const trashItems = vi.fn();
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => ({ renameFile, moveItems, trashItems }) }));

const note = (path: string, frontmatter: Record<string, unknown> = {}): FileMetadata => ({
  path, name: path.split("/").pop()!, tags: [], links: [], frontmatter, modifiedAt: 0, wordCount: 0, tasks: [], handle: null,
});
const turn = { id: "turn-1", label: "AI changes" };

async function setup() {
  const vault = new MemoryDirectoryHandle("vault");
  await vault.writeText("Projects/Roadmap.md", "# Roadmap");
  await vault.writeText("Projects/Budget.md", "# Budget");
  await vault.writeText("Ideas.md", "# Ideas");
  await vault.getDirectoryHandle("Archive", { create: true });
  const store = createStore();
  store.set(atom_vaultHandle, vault.asHandle());
  store.set(atom_fileMetadata, {
    "Projects/Roadmap.md": note("Projects/Roadmap.md"),
    "Projects/Budget.md": note("Projects/Budget.md", { private: true }),
    "Ideas.md": note("Ideas.md"),
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useCompanionOrganise(), { wrapper });
  return { store, organise: result.current };
}

describe("useCompanionOrganise", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renames through the app, keeping the extension, in the turn's undo group", async () => {
    renameFile.mockResolvedValue("Projects/Launch plan.md");
    const { organise } = await setup();

    const result = await organise.rename("turn-1", "Projects/Roadmap.md", "Launch plan");

    expect(renameFile).toHaveBeenCalledWith(expect.anything(), "Launch plan.md", "Projects/Roadmap.md", turn);
    expect(result.output).toContain("Renamed Projects/Roadmap.md to Projects/Launch plan.md");
  });

  it("won't rename onto an existing item", async () => {
    const { organise } = await setup();

    const result = await organise.rename("turn-1", "Ideas.md", "Projects/x");
    expect(result.detail).toBe("refused");

    expect((await organise.rename("turn-1", "Projects/Roadmap.md", "Budget")).detail).toBe("exists");
    expect(renameFile).not.toHaveBeenCalled();
  });

  it("moves into an existing folder only, and never a private note or a folder holding one", async () => {
    moveItems.mockResolvedValue([{ from: "Ideas.md", to: "Archive/Ideas.md" }]);
    const { organise } = await setup();

    expect((await organise.move("turn-1", ["Ideas.md"], "Nowhere")).output).toMatch(/create_folder first/);
    expect((await organise.move("turn-1", ["Projects/Budget.md"], "Archive")).detail).toBe("private");
    expect((await organise.move("turn-1", ["Projects"], "Archive")).detail).toBe("private");
    expect(moveItems).not.toHaveBeenCalled();

    const result = await organise.move("turn-1", ["Ideas.md"], "Archive");
    expect(moveItems).toHaveBeenCalledWith([expect.objectContaining({ name: "Ideas.md" })], expect.anything(), turn);
    expect(result.output).toContain("Ideas.md → Archive/Ideas.md");
  });

  it("asks before the Trash, and keeps the files when the user says Keep", async () => {
    const { store, organise } = await setup();

    let pending!: Promise<{ output: string; detail: string }>;
    act(() => { pending = organise.trash("turn-1", "call-1", ["Ideas.md"]); });
    await waitFor(() => expect(store.get(atom_trashRequests)["call-1"]).toEqual(["Ideas.md"]));
    act(() => answerTrash(store, "call-1", false));

    expect((await pending).detail).toBe("kept");
    expect(trashItems).not.toHaveBeenCalled();
    expect(store.get(atom_trashRequests)).toEqual({});
  });

  it("moves the files to the Trash once the user agrees", async () => {
    trashItems.mockResolvedValue([{ from: "Ideas.md", to: ".hermesmarkdown/trash/slot/Ideas.md" }]);
    const { store, organise } = await setup();

    let pending!: Promise<{ output: string; detail: string }>;
    act(() => { pending = organise.trash("turn-1", "call-2", ["Ideas.md"]); });
    await waitFor(() => expect(store.get(atom_trashRequests)["call-2"]).toBeDefined());
    act(() => answerTrash(store, "call-2", true));

    expect((await pending).output).toContain("Moved to the Trash");
    expect(trashItems).toHaveBeenCalledWith([expect.objectContaining({ path: "Ideas.md" })], turn);
  });
});
