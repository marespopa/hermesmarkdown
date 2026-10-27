import React from "react";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_vaultFolderPaths, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { NEW_TEMPLATE_BODY } from "./use-template-create";
import { useTemplateWizard } from "./use-template-wizard";

const mocks = vi.hoisted(() => ({
  openWizard: vi.fn(),
  select: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({ default: mocks.toast }));
vi.mock("../use-dialog", () => ({ useDialog: () => ({ select: mocks.select }) }));
vi.mock("../use-template-dialog", () => ({ useTemplateDialog: () => ({ openWizard: mocks.openWizard }) }));

async function setup() {
  const vault = new MemoryDirectoryHandle("vault");
  await vault.writeText("Clients/Acme/Plan.md", "# Plan");
  await vault.writeText("Clients/Acme/Notes/Call.md", "Call");
  const store = createStore();
  store.set(atom_vaultHandle, vault.asHandle());
  store.set(atom_vaultFolderPaths, ["Clients", "Clients/Acme", "Clients/Acme/Notes", "_templates"]);
  const props = {
    scanVault: vi.fn(async () => {}),
    indexVaultTags: vi.fn(async () => {}),
    openFile: vi.fn(async () => {}),
    createTemplate: vi.fn(async () => true),
  };
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useTemplateWizard(props), { wrapper });
  return { vault, props, run: result.current.newTemplate };
}

beforeEach(() => vi.clearAllMocks());

describe("useTemplateWizard", () => {
  it("does nothing when the wizard is cancelled", async () => {
    mocks.openWizard.mockResolvedValue(null);
    const { run, vault, props } = await setup();
    expect(await run()).toBe(false);
    expect(props.createTemplate).not.toHaveBeenCalled();
    expect(vault.listPaths().some((p) => p.startsWith("_templates"))).toBe(false);
  });

  it("writes a note template from blank or from a built-in example", async () => {
    const { run, props } = await setup();
    mocks.openWizard.mockResolvedValueOnce({ kind: "note", name: "Release notes", from: "blank" });
    await run();
    expect(props.createTemplate).toHaveBeenLastCalledWith(undefined, { name: "Release notes", body: NEW_TEMPLATE_BODY });
    mocks.openWizard.mockResolvedValueOnce({ kind: "note", name: "Sync", from: "example:builtin:meetings/Meeting notes" });
    await run();
    expect(props.createTemplate).toHaveBeenLastCalledWith(undefined, { name: "Sync", body: expect.stringContaining("Action items") });
  });

  it("makes a blank folder template that asks for its folder's name, and opens its README", async () => {
    mocks.openWizard.mockResolvedValue({ kind: "folder", name: "Client", from: "blank", askName: true });
    const { run, vault, props } = await setup();
    expect(await run()).toBe(true);
    const readme = vault.fileAt("_templates/{{Client}}/README.md")!;
    expect(readme.text()).toMatch(/^---\nscaffold: true\n---\n/);
    expect(readme.text()).toContain("# {{title}}");
    expect(props.openFile).toHaveBeenCalledWith(readme, "_templates/{{Client}}/README.md", true);
  });

  it("copies a built-in example under a fixed name", async () => {
    mocks.openWizard.mockResolvedValue({ kind: "folder", name: "Launch", from: "example:project-folder", askName: false });
    const { run, vault } = await setup();
    await run();
    expect(vault.listPaths("").filter((p) => p.startsWith("_templates/"))).toEqual([
      "_templates/Launch/Decisions.md",
      "_templates/Launch/Meetings/Kickoff.md",
      "_templates/Launch/README.md",
      "_templates/Launch/Tasks.md",
    ]);
  });

  it("copies a vault folder, offering only visible folders, and marks the copy", async () => {
    mocks.openWizard.mockResolvedValue({ kind: "folder", name: "Client", from: "vault", askName: true });
    mocks.select.mockResolvedValue("Clients/Acme");
    const { run, vault } = await setup();
    await run();
    const options = mocks.select.mock.calls[0][1] as { value: string }[];
    expect(options.map((o) => o.value)).toEqual(["Clients", "Clients/Acme", "Clients/Acme/Notes"]);
    expect(vault.fileAt("_templates/{{Client}}/Plan.md")!.text()).toBe("# Plan");
    expect(vault.fileAt("_templates/{{Client}}/Notes/Call.md")!.text()).toBe("Call");
    expect(vault.fileAt("_templates/{{Client}}/README.md")!.text()).toBe("---\nscaffold: true\n---\n");
    expect(vault.fileAt("Clients/Acme/README.md")).toBeUndefined();
  });

  it("never overwrites a template of the same name", async () => {
    mocks.openWizard.mockResolvedValue({ kind: "folder", name: "Launch", from: "blank", askName: false });
    const { run, vault } = await setup();
    await vault.writeText("_templates/Launch/Mine.md", "mine");
    expect(await run()).toBe(false);
    expect(mocks.toast.error).toHaveBeenCalledWith(expect.stringContaining("already a template named Launch"));
    expect(vault.listPaths().filter((p) => p.startsWith("_templates/"))).toEqual(["_templates/Launch/Mine.md"]);
  });

  it("asks for a name when nothing usable is left", async () => {
    mocks.openWizard.mockResolvedValue({ kind: "folder", name: "{{}}", from: "blank", askName: true });
    const { run } = await setup();
    expect(await run()).toBe(false);
    expect(mocks.toast.error).toHaveBeenCalledWith("Give the template a name");
  });
});
