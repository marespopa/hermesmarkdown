import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_vaultFolderPaths, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import TemplatesPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/editor" }));

const fileSystem = {
  openFile: vi.fn(async () => {}),
  scanVault: vi.fn(async () => {}),
  indexVaultTags: vi.fn(async () => {}),
  createTemplate: vi.fn(async () => true),
  newTemplate: vi.fn(async () => true),
};
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => fileSystem }));

const packs = {
  duplicatePack: vi.fn(async () => "Journal copy"),
  deletePack: vi.fn(async () => true),
  deleteTemplate: vi.fn(async () => true),
  deleteFolderTemplate: vi.fn(async () => true),
};
vi.mock("@/app/hooks/file-system/use-template-packs", () => ({ useTemplatePacks: () => packs }));

const resolveFileHandleAtPath = vi.hoisted(() => vi.fn(async (_vault: unknown, path: string) => ({ name: path })));
vi.mock("@/app/atoms/vault-atoms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/atoms/vault-atoms")>()),
  resolveFileHandleAtPath,
}));

const meta = (path: string) =>
  ({ path, name: path.split("/").pop()!, ...(path.endsWith("README.md") ? { frontmatter: { scaffold: "true" } } : {}) }) as unknown as FileMetadata;

function renderPage({
  vault = true,
  paths = ["_templates/Meeting.md", "_templates/Journal/Daily.md", "notes/a.md"],
  folders = ["_templates", "_templates/Journal", "_templates/Empty", "notes"],
} = {}) {
  const store = createStore();
  if (vault) store.set(atom_vaultHandle, { name: "Notes" } as unknown as FileSystemDirectoryHandle);
  store.set(atom_fileMetadata, Object.fromEntries(paths.map((path) => [path, meta(path)])));
  store.set(atom_vaultFolderPaths, folders);
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
    expect(packs.deleteTemplate).toHaveBeenCalledWith(expect.objectContaining({ path: "_templates/Meeting.md" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete template Daily" }));
    expect(packs.deleteTemplate).toHaveBeenCalledWith(expect.objectContaining({ path: "_templates/Journal/Daily.md" }));
    expect(packs.deletePack).not.toHaveBeenCalled();
  });

  it("has no Use button: templates are used from a note", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: "Use Daily" })).not.toBeInTheDocument();
  });

  it("opens a template to edit it", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Edit Daily" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/editor?file=_templates/Journal/Daily.md"));
    expect(fileSystem.openFile).toHaveBeenCalledWith({ name: "_templates/Journal/Daily.md" }, "_templates/Journal/Daily.md", true);
  });

  it("runs the pack actions on the pack", async () => {
    renderPage();
    const journal = screen.getByRole("region", { name: "Journal" });
    fireEvent.click(within(journal).getByRole("button", { name: "New template in Journal" }));
    await waitFor(() => expect(fileSystem.newTemplate).toHaveBeenCalledWith({ kind: "note", pack: "Journal" }));
    await waitFor(() => expect(within(journal).getByRole("button", { name: "Duplicate Journal" })).toBeEnabled());
    fireEvent.click(within(journal).getByRole("button", { name: "Duplicate Journal" }));
    expect(packs.duplicatePack).toHaveBeenCalledWith(expect.objectContaining({ name: "Journal", folder: "_templates/Journal" }));
    await waitFor(() => expect(within(journal).getByRole("button", { name: "Delete Journal" })).toBeEnabled());
    fireEvent.click(within(journal).getByRole("button", { name: "Delete Journal" }));
    expect(packs.deletePack).toHaveBeenCalledWith(expect.objectContaining({ name: "Journal" }));
  });

  it("has no New pack: a new pack is made in the wizard, with its first template", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: "New pack" })).not.toBeInTheDocument();
  });

  it("opens the template wizard from New template, then shows what it made", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "New template" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/editor"));
    expect(fileSystem.newTemplate).toHaveBeenCalledWith(undefined);
  });

  it("stays on the page when the wizard is cancelled", async () => {
    fileSystem.newTemplate.mockResolvedValueOnce(false);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "New template" }));
    await waitFor(() => expect(fileSystem.newTemplate).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("offers two note and two folder examples, each opening the wizard on it", async () => {
    renderPage();
    const starts = screen.getAllByRole("button", { name: /^Start from / }).map((b) => b.getAttribute("aria-label"));
    expect(starts).toEqual(["Start from Meeting notes", "Start from Project brief", "Start from Project folder", "Start from Research folder"]);
    fireEvent.click(screen.getByRole("button", { name: "Start from Research folder" }));
    await waitFor(() => expect(fileSystem.newTemplate).toHaveBeenCalledWith({ kind: "folder", from: "example:research-folder" }));
    fireEvent.click(screen.getByRole("button", { name: "Start from Meeting notes" }));
    expect(fileSystem.newTemplate).toHaveBeenCalledWith({ kind: "note", from: "example:builtin:meetings/Meeting notes" });
  });

  it("lists your folder templates by their readable name, to edit or delete", async () => {
    const readme = "_templates/{{Research topic}}/README.md";
    renderPage({ paths: [readme, "_templates/{{Research topic}}/Sources.md"] });
    const list = screen.getByRole("region", { name: "Folder templates" });
    expect(within(list).getByText("Research topic")).toBeInTheDocument();
    expect(within(list).getByText("Asks for the new folder's name")).toBeInTheDocument();
    fireEvent.click(within(list).getByRole("button", { name: "Delete folder template Research topic" }));
    expect(packs.deleteFolderTemplate).toHaveBeenCalledWith(expect.objectContaining({ folder: "_templates/{{Research topic}}" }));
    await waitFor(() => expect(within(list).getByRole("button", { name: "Edit Research topic" })).toBeEnabled());
    fireEvent.click(within(list).getByRole("button", { name: "Edit Research topic" }));
    await waitFor(() => expect(fileSystem.openFile).toHaveBeenCalledWith({ name: readme }, readme, true));
  });

  it("invites you to make a first template when there are none", () => {
    renderPage({ paths: ["notes/a.md"], folders: ["notes"] });
    expect(screen.getByText(/No templates yet. Make one with New template/)).toBeInTheDocument();
  });

  it("runs Duplicate and Delete once, however fast you click, and spins until done", async () => {
    let finish!: (name: string) => void;
    packs.duplicatePack.mockImplementationOnce(() => new Promise<string>((resolve) => { finish = resolve; }));
    renderPage();
    const journal = screen.getByRole("region", { name: "Journal" });
    const duplicate = within(journal).getByRole("button", { name: "Duplicate Journal" });
    fireEvent.click(duplicate);
    fireEvent.click(duplicate);
    expect(packs.duplicatePack).toHaveBeenCalledTimes(1);
    expect(within(journal).getByRole("button", { name: "Duplicate Journal" })).toHaveAttribute("aria-busy", "true");
    expect(within(journal).getByRole("button", { name: "Delete Journal" })).toBeDisabled();
    fireEvent.click(within(journal).getByRole("button", { name: "Delete Journal" }));
    expect(packs.deletePack).not.toHaveBeenCalled();

    await act(async () => finish("Journal copy"));
    expect(within(journal).getByRole("button", { name: "Duplicate Journal" })).toBeEnabled();
  });

  it("deletes a template once on a double click", async () => {
    let finish!: (ok: boolean) => void;
    packs.deleteTemplate.mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Delete template Daily" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete template Daily" }));
    expect(packs.deleteTemplate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Edit Daily" })).toBeDisabled();
    await act(async () => finish(true));
  });

  it("opens one wizard at a time: New template and the examples wait while it's open", async () => {
    let finish!: (made: boolean) => void;
    fileSystem.newTemplate.mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Start from Project brief" }));
    expect(screen.getByRole("button", { name: "Start from Project brief" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "New template" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start from Research folder" })).toBeDisabled();
    await act(async () => finish(false));
    expect(screen.getByRole("button", { name: "New template" })).toBeEnabled();
  });

  it("links to the documentation on making your own template", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Help: How to make your own template" })).toHaveAttribute("href", "/documentation#templates-page");
  });

  it("asks for a vault first, and reads the vault when opened on this page", () => {
    renderPage({ vault: false });
    expect(screen.getByText(/Open a vault in the editor/)).toBeInTheDocument();
    expect(screen.queryByText("Your templates")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start from Project folder" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "New template" })).not.toBeInTheDocument();

    renderPage({ paths: [] });
    expect(fileSystem.scanVault).toHaveBeenCalled();
  });
});
