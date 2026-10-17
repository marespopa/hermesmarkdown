import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_vaultFolderPaths, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import TemplatesPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const fileSystem = {
  openFile: vi.fn(async () => {}),
  scanVault: vi.fn(async () => {}),
  indexVaultTags: vi.fn(async () => {}),
  createTemplate: vi.fn(async () => true),
};
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => fileSystem }));

const packs = {
  addBuiltinPack: vi.fn(async () => 1),
  createPack: vi.fn(async () => "Work"),
  duplicatePack: vi.fn(async () => "Journal copy"),
  deletePack: vi.fn(async () => true),
  deleteTemplate: vi.fn(async () => true),
};
vi.mock("@/app/hooks/file-system/use-template-packs", () => ({ useTemplatePacks: () => packs }));

const resolveFileHandleAtPath = vi.hoisted(() => vi.fn(async (_vault: unknown, path: string) => ({ name: path })));
vi.mock("@/app/atoms/vault-atoms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/atoms/vault-atoms")>()),
  resolveFileHandleAtPath,
}));

const meta = (path: string) => ({ path, name: path.split("/").pop()! }) as FileMetadata;

function renderPage({ vault = true, paths = ["templates/Meeting.md", "templates/Journal/Daily.md", "notes/a.md"] } = {}) {
  const store = createStore();
  if (vault) store.set(atom_vaultHandle, { name: "Notes" } as unknown as FileSystemDirectoryHandle);
  store.set(atom_fileMetadata, Object.fromEntries(paths.map((path) => [path, meta(path)])));
  store.set(atom_vaultFolderPaths, ["templates", "templates/Journal", "templates/Empty", "notes"]);
  render(<Provider store={store}><TemplatesPage /></Provider>);
}

describe("TemplatesPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists your templates by pack, those in no pack first, empty packs too", () => {
    renderPage();
    const sections = screen.getAllByRole("region").map((region) => region.getAttribute("aria-label")).filter(Boolean);
    expect(sections.slice(0, 3)).toEqual(["Not in a pack", "Empty", "Journal"]);
    expect(within(screen.getByRole("region", { name: "Journal" })).getByText("Daily")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Empty" })).getByText("No templates in this pack yet.")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Not in a pack" })).queryByRole("button", { name: "Delete Not in a pack" })).not.toBeInTheDocument();
  });

  it("deletes one template, in a pack or not", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Delete template Meeting" }));
    expect(packs.deleteTemplate).toHaveBeenCalledWith(expect.objectContaining({ path: "templates/Meeting.md" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete template Daily" }));
    expect(packs.deleteTemplate).toHaveBeenCalledWith(expect.objectContaining({ path: "templates/Journal/Daily.md" }));
    expect(packs.deletePack).not.toHaveBeenCalled();
  });

  it("has no Use button: templates are used from a note", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: "Use Daily" })).not.toBeInTheDocument();
  });

  it("opens a template to edit it", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Edit Daily" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/editor?file=templates/Journal/Daily.md"));
    expect(fileSystem.openFile).toHaveBeenCalledWith({ name: "templates/Journal/Daily.md" }, "templates/Journal/Daily.md", true);
  });

  it("runs the pack actions on the pack", async () => {
    renderPage();
    const journal = screen.getByRole("region", { name: "Journal" });
    fireEvent.click(within(journal).getByRole("button", { name: "New template in Journal" }));
    await waitFor(() => expect(fileSystem.createTemplate).toHaveBeenCalledWith("Journal"));
    fireEvent.click(within(journal).getByRole("button", { name: "Duplicate Journal" }));
    fireEvent.click(within(journal).getByRole("button", { name: "Delete Journal" }));
    expect(packs.duplicatePack).toHaveBeenCalledWith(expect.objectContaining({ name: "Journal", folder: "templates/Journal" }));
    expect(packs.deletePack).toHaveBeenCalledWith(expect.objectContaining({ name: "Journal" }));
    fireEvent.click(screen.getByRole("button", { name: "New pack" }));
    expect(packs.createPack).toHaveBeenCalled();
  });

  it("offers the built-in packs, counting what's already there", () => {
    renderPage();
    const journal = screen.getByRole("region", { name: "Journal pack" });
    fireEvent.click(within(journal).getByRole("button", { name: /Add 4 missing: Journal/ }));
    expect(packs.addBuiltinPack).toHaveBeenCalledWith(expect.objectContaining({ name: "Journal" }));
    expect(within(screen.getByRole("region", { name: "Meetings pack" })).getByRole("button", { name: "Add to vault: Meetings" })).toBeEnabled();
  });

  it("disables a pack's button and spins from the first click until the pack is added", async () => {
    let finish!: (written: number) => void;
    packs.addBuiltinPack.mockImplementationOnce(() => new Promise<number>((resolve) => { finish = resolve; }));
    renderPage();
    const journal = screen.getByRole("region", { name: "Journal pack" });
    fireEvent.click(within(journal).getByRole("button", { name: /Add 4 missing: Journal/ }));

    const adding = within(journal).getByRole("button", { name: "Adding…: Journal" });
    expect(adding).toBeDisabled();
    expect(adding).toHaveAttribute("aria-busy", "true");
    fireEvent.click(adding);
    expect(packs.addBuiltinPack).toHaveBeenCalledTimes(1);

    await act(async () => finish(4));
    expect(within(journal).getByRole("button", { name: /Add 4 missing: Journal/ })).toBeEnabled();
  });

  it("asks for a vault first, and reads the vault when opened on this page", () => {
    renderPage({ vault: false });
    expect(screen.getByText(/Open a vault in the editor/)).toBeInTheDocument();
    expect(screen.queryByText("Your templates")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to vault: Meetings" })).toBeDisabled();

    renderPage({ paths: [] });
    expect(fileSystem.scanVault).toHaveBeenCalled();
  });
});
