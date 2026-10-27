"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_templatesFolder, type TemplateWizardResult } from "@/app/atoms/template-atoms";
import { atom_vaultFolderPaths, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { newFolderTemplatePlan, type ScaffoldSourceEntry } from "@/app/utils/templates/folder-template";
import { builtinFolderSource, BUILTIN_FOLDER_TEMPLATES } from "@/app/utils/templates/template-folders";
import { STARTER_TEMPLATES } from "@/app/utils/templates/template-packs";
import { useDialog } from "../use-dialog";
import { useTemplateDialog } from "../use-template-dialog";
import { entryExists } from "./directory-ops";
import { readFolderSource, rollbackScaffold, ScaffoldClashError, writeScaffold } from "./folder-template-ops";
import { ensureVaultFolder } from "./unique-file";
import { NEW_TEMPLATE_BODY } from "./use-template-create";
import { holdVaultSync } from "./vault-sync-hold";

interface UseTemplateWizardProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
  /** use-template-create's: writes `_templates/<name>.md` and opens it. */
  createTemplate: (pack?: string, from?: { name: string; body: string }) => Promise<boolean>;
}

// A blank folder template's README: the new folder's name as its heading.
const BLANK_FOLDER_README = "# {{title}}\n\n{{cursor}}\n";

// One path segment, no leading dots, no braces (they'd make it a token), no
// characters file systems reject. Empty when nothing is left.
const folderTemplateName = (name: string) =>
  name.replace(/[\\/:*?"<>|{}]/g, "-").trim().replace(/^\.+/, "").replace(/^-+|-+$/g, "").trim();

const isHiddenSegment = (path: string) => path.split("/").some((s) => s.startsWith("_") || s.startsWith("."));

// Shows a loading toast only when the work takes a moment.
async function withSlowNotice<T>(message: string, work: () => Promise<T>): Promise<T> {
  let notice: string | undefined;
  const timer = setTimeout(() => { notice = toast.loading(message); }, 200);
  try {
    return await work();
  } finally {
    clearTimeout(timer);
    if (notice) toast.dismiss(notice);
  }
}

// "New template…": the template wizard (TemplateWizard), then the template.
// A note template is `_templates/<name>.md` (blank, or a built-in example's
// text). A folder template is `_templates/<name>/` (or `{{<name>}}/` when it
// asks for its folder's name) with `scaffold: true` on its README: blank, a
// built-in example, or a copy of a vault folder. Never overwrites; opens what
// it made.
export function useTemplateWizard({ scanVault, indexVaultTags, openFile, createTemplate }: UseTemplateWizardProps) {
  const store = useStore();
  const dialog = useDialog();
  const { openWizard } = useTemplateDialog();

  const folderEntries = useCallback(async (
    vault: FileSystemDirectoryHandle,
    from: Extract<TemplateWizardResult, { kind: "folder" }>["from"],
  ): Promise<ScaffoldSourceEntry[] | null> => {
    if (from === "blank") return [{ path: "README.md", kind: "file", text: BLANK_FOLDER_README }];
    if (from !== "vault") {
      const pack = BUILTIN_FOLDER_TEMPLATES.find((p) => `example:${p.id}` === from);
      return pack ? builtinFolderSource(pack).entries : null;
    }
    const folders = store.get(atom_vaultFolderPaths).filter((p) => !isHiddenSegment(p)).sort((a, b) => a.localeCompare(b));
    const picked = await dialog.select(
      "Choose the folder to copy:",
      folders.map((path) => ({ label: path, value: path })),
      "New folder template",
    );
    if (!picked) return null;
    try {
      return (await withSlowNotice(`Reading ${picked}…`, () => readFolderSource(vault, String(picked), String(picked)))).entries;
    } catch (err) {
      console.warn("Couldn't read the folder for a template:", err);
      toast.error(`Couldn't read ${picked}`);
      return null;
    }
  }, [store, dialog]);

  const createFolderTemplate = useCallback(async (
    vault: FileSystemDirectoryHandle,
    result: Extract<TemplateWizardResult, { kind: "folder" }>,
  ): Promise<boolean> => {
    const name = folderTemplateName(result.name);
    if (!name) {
      toast.error("Give the template a name");
      return false;
    }
    const folderName = result.askName ? `{{${name}}}` : name;
    const root = store.get(atom_templatesFolder).folder;
    const entries = await folderEntries(vault, result.from);
    if (!entries) return false;

    return holdVaultSync(async () => {
      let templatesDir: FileSystemDirectoryHandle;
      try {
        templatesDir = await ensureVaultFolder(vault, root);
        if (await entryExists(templatesDir, folderName)) {
          toast.error(`There's already a template named ${name} in ${root}/. Nothing was created.`);
          return false;
        }
      } catch (err: any) {
        toast.error(`Couldn't create the folder template ${name}: ${err?.message || "write failed"}`);
        return false;
      }
      const plan = newFolderTemplatePlan(folderName, entries);
      try {
        const { rootReadme } = await withSlowNotice(`Creating ${name}…`, () => writeScaffold(templatesDir, plan));
        await scanVault(vault);
        await indexVaultTags();
        const readme = plan.entries.find((e) => e.isRootReadme);
        if (rootReadme && readme) await openFile(rootReadme, `${root}/${readme.path}`, true);
        toast.success(`Created the folder template ${name}. Use it with New from folder template.`);
        return true;
      } catch (err: any) {
        if (!(err instanceof ScaffoldClashError && err.beforeWrites)) await rollbackScaffold(templatesDir, folderName);
        await scanVault(vault).catch(() => {});
        toast.error(`Couldn't create the folder template ${name}: ${err?.message || "write failed"}. Nothing was kept.`);
        return false;
      }
    });
  }, [store, folderEntries, scanVault, indexVaultTags, openFile]);

  const newTemplate = useCallback(async (): Promise<boolean> => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return false;
    const result = await openWizard();
    if (!result) return false;
    if (result.kind === "folder") return createFolderTemplate(vault, result);
    const example = STARTER_TEMPLATES.find((t) => `example:${t.path}` === result.from);
    return createTemplate(undefined, { name: result.name, body: example?.body ?? NEW_TEMPLATE_BODY });
  }, [store, openWizard, createFolderTemplate, createTemplate]);

  return { newTemplate };
}
