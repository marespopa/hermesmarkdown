import React from "react";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_busyPaths } from "@/app/atoms/busy-path-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_pendingTreeEntries } from "@/app/atoms/pending-tree-atoms";
import { atom_pendingScrollTarget } from "@/app/atoms/ui-atoms";
import { atom_vaultFolderPaths, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import type { ScaffoldSource } from "@/app/utils/templates/folder-template";
import { useFolderTemplate } from "./use-folder-template";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  askPrompts: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  read: vi.fn(),
  write: vi.fn(),
  rollback: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({ default: mocks.toast }));
vi.mock("../use-dialog", () => ({ useDialog: () => ({ select: mocks.select }) }));
vi.mock("../use-template-dialog", () => ({ useTemplateDialog: () => ({ askPrompts: mocks.askPrompts }) }));
vi.mock("./folder-template-ops", async (importActual) => ({
  ...(await importActual<typeof import("./folder-template-ops")>()),
  readScaffoldSource: mocks.read,
  writeScaffold: mocks.write,
  rollbackScaffold: mocks.rollback,
}));

const source: ScaffoldSource = {
  name: "{{prompt:Client}} launch",
  entries: [
    { path: "Notes", kind: "folder" },
    { path: "Notes/Kickoff.md", kind: "file", text: "Kick" },
    { path: "README.md", kind: "file", text: "# {{title}}\n{{prompt:Goal}}{{cursor}}" },
  ],
};

const meta = { path: "_templates/Launch/README.md", name: "README", tags: [], links: [], frontmatter: { scaffold: "true" }, modifiedAt: 0, wordCount: 0, tasks: [], handle: null };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function setup({ withTemplate = true, existing = [] as string[] } = {}) {
  const vault = new MemoryDirectoryHandle("vault");
  await vault.writeText("Projects/keep.md", "x");
  for (const path of existing) await vault.writeText(path, "x");
  const store = createStore();
  store.set(atom_vaultHandle, vault.asHandle());
  if (withTemplate) store.set(atom_fileMetadata, { [meta.path]: meta });
  const props = { scanVault: vi.fn(async () => {}), indexVaultTags: vi.fn(async () => {}), openFile: vi.fn(async () => {}) };
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useFolderTemplate(props), { wrapper });
  return { store, props, run: result.current.newFromFolderTemplate };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue(source);
  mocks.write.mockResolvedValue({ rootReadme: null });
  mocks.rollback.mockResolvedValue(true);
  mocks.select.mockImplementation(async (_message: string, options: { value: string }[]) => options[0].value);
  mocks.askPrompts.mockResolvedValue({ Client: "Acme", Goal: "ship" });
});

describe("useFolderTemplate", () => {
  it("lists the vault's folder templates, then the built-in ones", async () => {
    const { run } = await setup();
    await run();
    const options = mocks.select.mock.calls[0][1] as { label: string; value: string }[];
    expect(options).toEqual([
      { label: "Launch", value: "_templates/Launch" },
      { label: "Project folder (built-in)", value: "builtin:project-folder" },
      { label: "Research folder (built-in)", value: "builtin:research-folder" },
    ]);
  });

  it("makes a built-in folder template from memory, without reading or copying it into the vault", async () => {
    mocks.askPrompts.mockResolvedValue({ "Project name": "Mobile app" });
    const { run } = await setup({ withTemplate: false });
    expect(await run("Projects")).toBe("Projects/Mobile app");
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.askPrompts).toHaveBeenCalledWith(["Project name"], "Create");
    await vi.waitFor(() => expect(mocks.write).toHaveBeenCalledOnce());
    const plan = mocks.write.mock.calls[0][1] as { topName: string; entries: { path: string }[] };
    expect(plan.topName).toBe("Mobile app");
    expect(plan.entries.map((e) => e.path)).toContain("Mobile app/Meetings/Kickoff.md");
  });

  it.each([
    ["the pick", 1],
    ["the destination", 2],
  ])("writes nothing when %s is cancelled", async (_name, call) => {
    mocks.select.mockImplementation(async (_m: string, options: { value: string }[]) =>
      (mocks.select.mock.calls.length === call ? null : options[0].value));
    const { run, store } = await setup();
    expect(await run()).toBeNull();
    expect(mocks.write).not.toHaveBeenCalled();
    expect(store.get(atom_pendingTreeEntries).size).toBe(0);
    expect(store.get(atom_busyPaths).size).toBe(0);
  });

  it("writes nothing when the prompts are cancelled", async () => {
    mocks.askPrompts.mockResolvedValue(null);
    const { run, store } = await setup();
    expect(await run()).toBeNull();
    expect(mocks.write).not.toHaveBeenCalled();
    expect(store.get(atom_pendingTreeEntries).size).toBe(0);
  });

  it("asks the prompts once with the combined labels", async () => {
    const { run } = await setup();
    await run();
    expect(mocks.askPrompts).toHaveBeenCalledOnce();
    expect(mocks.askPrompts).toHaveBeenCalledWith(["Client", "Goal"], "Create");
  });

  it("offers the root first, then the indexed folders without hidden ones", async () => {
    const { run, store } = await setup();
    store.set(atom_vaultFolderPaths, ["Projects", "_templates", "Projects/.git", "Areas"]);
    await run();
    const options = mocks.select.mock.calls[1][1] as { label: string; value: string }[];
    expect(options.map((o) => o.value)).toEqual(["__root__", "path:Areas", "path:Projects"]);
    expect(options[0].label).toBe("/ vault (root)");
  });

  it("skips the destination select when a destination is given", async () => {
    const { run } = await setup();
    expect(await run("Projects")).toBe("Projects/Acme launch");
    expect(mocks.select).toHaveBeenCalledOnce();
  });

  it("stops with a toast when the top folder exists", async () => {
    const { run, store } = await setup({ existing: ["Acme launch/old.md"] });
    expect(await run()).toBeNull();
    expect(mocks.toast.error).toHaveBeenCalledWith("Acme launch already exists. Nothing was created.");
    expect(mocks.write).not.toHaveBeenCalled();
    expect(store.get(atom_pendingTreeEntries).size).toBe(0);
    expect(store.get(atom_busyPaths).size).toBe(0);
  });

  it("stops with a toast when the destination is gone", async () => {
    const { run } = await setup();
    expect(await run("Missing")).toBeNull();
    expect(mocks.toast.error).toHaveBeenCalledWith("Missing no longer exists. Nothing was created.");
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("shows pending rows and busy before the writes finish, then makes them real", async () => {
    const write = deferred<{ rootReadme: FileSystemFileHandle | null }>();
    mocks.write.mockReturnValue(write.promise);
    const { run, store, props } = await setup();

    expect(await run()).toBe("Acme launch");
    const pending = [...store.get(atom_pendingTreeEntries).values()];
    expect(pending).toHaveLength(1);
    expect(pending[0].folders).toEqual(["Acme launch", "Acme launch/Notes"]);
    expect(pending[0].files).toEqual(["Acme launch/Notes/Kickoff.md", "Acme launch/README.md"]);
    expect(store.get(atom_busyPaths).get("Acme launch")).toEqual({ op: "create" });
    expect(props.scanVault).not.toHaveBeenCalled();

    const handle = { name: "README.md" } as FileSystemFileHandle;
    write.resolve({ rootReadme: handle });
    await vi.waitFor(() => expect(props.openFile).toHaveBeenCalled());

    expect(props.scanVault).toHaveBeenCalled();
    expect(props.indexVaultTags).toHaveBeenCalled();
    expect(store.get(atom_pendingTreeEntries).size).toBe(0);
    expect(store.get(atom_busyPaths).size).toBe(0);
    expect(store.get(atom_vaultFolderPaths)).toEqual(["Acme launch", "Acme launch/Notes"]);
    expect(mocks.toast.success).toHaveBeenCalledWith("Created Acme launch: 2 files");
    expect(props.openFile).toHaveBeenCalledWith(handle, "Acme launch/README.md", true);
    expect(store.get(atom_pendingScrollTarget)).toEqual({ path: "Acme launch/README.md", line: 2, column: 4 });
  });

  it("rolls back, clears the rows and reports when a write fails", async () => {
    mocks.write.mockRejectedValue(new Error("disk full"));
    const { run, store, props } = await setup();
    await run();
    await vi.waitFor(() => expect(mocks.toast.error).toHaveBeenCalled());
    expect(mocks.rollback).toHaveBeenCalledOnce();
    expect(mocks.rollback.mock.calls[0][1]).toBe("Acme launch");
    expect(store.get(atom_pendingTreeEntries).size).toBe(0);
    expect(store.get(atom_busyPaths).size).toBe(0);
    expect(props.scanVault).toHaveBeenCalled();
    expect(mocks.toast.error).toHaveBeenCalledWith("Couldn't create Acme launch: disk full. Nothing was kept.");
    expect(props.openFile).not.toHaveBeenCalled();
  });

  it("says what is left when the rollback fails too", async () => {
    mocks.write.mockRejectedValue(new Error("disk full"));
    mocks.rollback.mockResolvedValue(false);
    const { run } = await setup();
    await run();
    await vi.waitFor(() => expect(mocks.toast.error).toHaveBeenCalled());
    expect(mocks.toast.error).toHaveBeenCalledWith("Couldn't create Acme launch, and some of it is still there. Check Acme launch.");
  });
});
