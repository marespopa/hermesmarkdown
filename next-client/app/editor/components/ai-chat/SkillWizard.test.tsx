import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import SkillWizard from "./SkillWizard";

const readCurrentText = vi.fn();
const createFile = vi.fn();
const writeFile = vi.fn();
const renameSkill = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/hooks/file-system/use-note-buffer", () => ({ useNoteBuffer: () => ({ readCurrentText, writeThrough: vi.fn() }) }));
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => ({ scanVault: vi.fn().mockResolvedValue(undefined), indexVaultTags: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock("../companion/use-companion-writes", () => ({ useCompanionWrites: () => ({ createFile, writeFile }) }));
vi.mock("../companion/use-companion-organise", () => ({ useCompanionOrganise: () => ({ rename: renameSkill }) }));

function renderWizard({ skillPath, vault }: { skillPath?: string; vault?: MemoryDirectoryHandle } = {}) {
  const store = createStore();
  if (vault) store.set(atom_vaultHandle, vault.asHandle());
  if (skillPath) store.set(atom_fileMetadata, { [skillPath]: { path: skillPath, name: skillPath.split("/").at(-1)!, tags: [], links: [], frontmatter: { type: "skill" }, modifiedAt: 0, wordCount: 0, tasks: [], handle: null } });
  return render(<Provider store={store}><SkillWizard open skillPath={skillPath} onClose={vi.fn()} /></Provider>);
}

describe("SkillWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readCurrentText.mockResolvedValue("---\ntype: skill\nowner: team\n---\nDisk instructions.");
    createFile.mockResolvedValue({ output: "Created Release review.md.", detail: "" });
    writeFile.mockResolvedValue({ output: "Saved skills/review.md.", detail: "" });
    renameSkill.mockResolvedValue({ output: "Renamed skill.", detail: "" });
  });

  it("creates a declarative skill note through the existing file writer", async () => {
    renderWizard({ vault: new MemoryDirectoryHandle("vault") });
    fireEvent.change(screen.getByRole("textbox", { name: "skill-name" }), { target: { value: "Release review" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Instructions" }), { target: { value: "Read the changelog and summarize risks." } });
    fireEvent.click(screen.getByRole("button", { name: "Save skill" }));
    await waitFor(() => expect(createFile).toHaveBeenCalledOnce());
    const [, path, content, asIs] = createFile.mock.calls[0];
    expect(path).toBe("Release review.md");
    expect(content).toContain("type: skill");
    expect(content).toContain("Read the changelog and summarize risks.");
    expect(asIs).toBe(true);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("rejects invalid names and empty bodies without writing", async () => {
    renderWizard({ vault: new MemoryDirectoryHandle("vault") });
    fireEvent.change(screen.getByRole("textbox", { name: "skill-name" }), { target: { value: "../unsafe" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Instructions" }), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Save skill" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a name");
    expect(createFile).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("rejects a built-in command collision without writing", async () => {
    renderWizard({ vault: new MemoryDirectoryHandle("vault") });
    fireEvent.change(screen.getByRole("textbox", { name: "skill-name" }), { target: { value: "Template" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Instructions" }), { target: { value: "Instructions" } });
    fireEvent.click(screen.getByRole("button", { name: "Save skill" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already in use");
    expect(createFile).not.toHaveBeenCalled();
  });

  it("does not overwrite a skill changed on disk after it was loaded", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("skills/review.md", "---\ntype: skill\n---\nOriginal.");
    readCurrentText.mockResolvedValueOnce("---\ntype: skill\n---\nOriginal.").mockResolvedValueOnce("---\ntype: skill\n---\nChanged on disk.");
    renderWizard({ skillPath: "skills/review.md", vault });
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Instructions" })).toHaveValue("Original."));
    fireEvent.change(screen.getByRole("textbox", { name: "Instructions" }), { target: { value: "Edited form." } });
    fireEvent.click(screen.getByRole("button", { name: "Save skill" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("changed on disk");
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("renames an edited skill through the normal file operation when its name changes", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("skills/review.md", "---\ntype: skill\n---\nOriginal.");
    readCurrentText.mockResolvedValue("---\ntype: skill\n---\nOriginal.");
    renderWizard({ skillPath: "skills/review.md", vault });
    await waitFor(() => expect(screen.getByRole("textbox", { name: "skill-name" })).toHaveValue("review"));
    fireEvent.change(screen.getByRole("textbox", { name: "skill-name" }), { target: { value: "audit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save skill" }));
    await waitFor(() => expect(renameSkill).toHaveBeenCalledWith(expect.any(String), "skills/review.md", "audit.md"));
    expect(writeFile).toHaveBeenCalledWith(expect.any(String), "skills/audit.md", expect.stringContaining("title: audit"));
  });

  it("loads disk-backed text, preserves unrelated frontmatter and uses write-through for edits", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("skills/review.md", "---\ntype: skill\nowner: team\n---\nDisk instructions.");
    readCurrentText.mockResolvedValue("---\ntype: skill\nowner: team\n---\nDisk instructions.");
    renderWizard({ skillPath: "skills/review.md", vault });
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Instructions" })).toHaveValue("Disk instructions."));
    fireEvent.change(screen.getByRole("textbox", { name: "Instructions" }), { target: { value: "Updated from disk." } });
    fireEvent.click(screen.getByRole("button", { name: "Save skill" }));
    await waitFor(() => expect(writeFile).toHaveBeenCalledOnce());
    expect(readCurrentText).toHaveBeenCalledWith("skills/review.md");
    const [, path, content] = writeFile.mock.calls[0];
    expect(path).toBe("skills/review.md");
    expect(content).toContain("owner: team");
    expect(content).toContain("Updated from disk.");
  });
});
