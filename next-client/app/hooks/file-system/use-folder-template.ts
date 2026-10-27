"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_vaultFolderPaths, atom_vaultHandle, atom_vaultName } from "@/app/atoms/vault-atoms";
import { atom_pendingScrollTarget } from "@/app/atoms/ui-atoms";
import { atom_folderTemplates } from "@/app/atoms/template-atoms";
import { atom_clearBusy, atom_markBusy } from "@/app/atoms/busy-path-atoms";
import { atom_addPendingTree, atom_removePendingTree } from "@/app/atoms/pending-tree-atoms";
import {
  folderTemplateDisplayName,
  planScaffold,
  scaffoldPromptLabels,
  scaffoldUsesClipboard,
  type ScaffoldPlan,
} from "@/app/utils/templates/folder-template";
import { offsetToLineColumn } from "@/app/utils/templates/template-tokens";
import { useDialog } from "../use-dialog";
import { useTemplateDialog } from "../use-template-dialog";
import { directoryAtPath, entryExists } from "./directory-ops";
import { readScaffoldSource, rollbackScaffold, ScaffoldClashError, writeScaffold } from "./folder-template-ops";
import { readClipboard } from "./use-template-notes";
import { holdVaultSync } from "./vault-sync-hold";

interface UseFolderTemplateProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

type OkPlan = Extract<ScaffoldPlan, { ok: true }>;

const ROOT_VALUE = "__root__";
const NO_TEMPLATES =
  "No folder templates yet. Add scaffold: true to the frontmatter of a README.md in a folder inside _templates/.";
const isHiddenSegment = (path: string) => path.split("/").some((s) => s.startsWith("_") || s.startsWith("."));

let runCounter = 0;

// "New from folder template": copies a folder template (_templates/<F>/ with
// `scaffold: true` in its README.md) into a new folder in the vault. The tree
// shows the result at once (pending rows + a busy top folder); the writes run
// in the background and are rolled back as a whole on failure. Never overwrites.
export function useFolderTemplate({ scanVault, indexVaultTags, openFile }: UseFolderTemplateProps) {
  const store = useStore();
  const dialog = useDialog();
  const { askPrompts } = useTemplateDialog();

  const runWrites = useCallback(async (
    vault: FileSystemDirectoryHandle,
    destination: FileSystemDirectoryHandle,
    destinationPath: string,
    topPath: string,
    plan: OkPlan,
    runId: string,
  ) => {
    const clear = () => {
      store.set(atom_removePendingTree, runId);
      store.set(atom_clearBusy, [topPath]);
    };
    const prefix = (path: string) => (destinationPath ? `${destinationPath}/${path}` : path);
    let result: Awaited<ReturnType<typeof writeScaffold>>;
    try {
      result = await writeScaffold(destination, plan);
    } catch (err: any) {
      let kept = false;
      if (!(err instanceof ScaffoldClashError && err.beforeWrites)) {
        try {
          kept = !(await rollbackScaffold(await directoryAtPath(vault, destinationPath), plan.topName));
        } catch {
          kept = true;
        }
      }
      clear();
      await scanVault(vault).catch(() => {});
      toast.error(kept
        ? `Couldn't create ${topPath}, and some of it is still there. Check ${topPath}.`
        : `Couldn't create ${topPath}: ${err?.message || "write failed"}. Nothing was kept.`);
      return;
    }

    try {
      const folders = plan.entries.filter((e) => e.kind === "folder").map((e) => prefix(e.path));
      store.set(atom_vaultFolderPaths, (prev) => [...new Set([...prev, ...folders])]);
      await scanVault(vault);
      await indexVaultTags();
    } finally {
      // Rows turn real and the busy mark goes together.
      clear();
    }
    toast.success(`Created ${topPath}: ${plan.noteCount} ${plan.noteCount === 1 ? "note" : "notes"}`);
    const readme = plan.entries.find((e) => e.isRootReadme);
    if (readme && result.rootReadme) {
      const path = prefix(readme.path);
      await openFile(result.rootReadme, path, true);
      if (readme.cursor != null && typeof readme.content === "string") {
        store.set(atom_pendingScrollTarget, { path, ...offsetToLineColumn(readme.content, readme.cursor) });
      }
    }
  }, [store, scanVault, indexVaultTags, openFile]);

  const newFromFolderTemplate = useCallback(async (destinationArg?: string): Promise<string | null> => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return null;
    const templates = store.get(atom_folderTemplates);
    if (templates.length === 0) {
      toast.error(NO_TEMPLATES);
      return null;
    }

    const now = new Date();
    const named = templates
      .map((t) => ({ t, label: folderTemplateDisplayName(t.name, now) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const picked = await dialog.select(
      "Choose a folder template:",
      named.map(({ t, label }) => ({ label, value: t.folder })),
      "New from Folder Template",
    );
    const template = picked ? templates.find((t) => t.folder === picked) : undefined;
    if (!template) return null;

    let destinationPath = destinationArg;
    if (destinationPath === undefined) {
      const vaultName = store.get(atom_vaultName) ?? vault.name;
      const folders = store.get(atom_vaultFolderPaths).filter((p) => !isHiddenSegment(p)).sort((a, b) => a.localeCompare(b));
      const chosen = await dialog.select(
        "Choose a destination folder:",
        [
          { label: `/ ${vaultName} (root)`, value: ROOT_VALUE },
          ...folders.map((p) => ({ label: p, value: `path:${p}` })),
        ],
        "New from Folder Template",
      );
      if (!chosen) return null;
      destinationPath = chosen === ROOT_VALUE ? "" : String(chosen).slice("path:".length);
    }

    let source: Awaited<ReturnType<typeof readScaffoldSource>>;
    try {
      source = await readScaffoldSource(vault, template);
    } catch (err) {
      console.error("Failed to read the folder template:", err);
      toast.error(`Couldn't read the folder template ${template.name}`);
      return null;
    }

    const labels = scaffoldPromptLabels(source);
    let prompts: Record<string, string> = {};
    if (labels.length > 0) {
      const answers = await askPrompts(labels, "Create");
      if (!answers) return null;
      prompts = answers;
    }
    const clipboard = scaffoldUsesClipboard(source) ? await readClipboard() : "";
    const plan = planScaffold(source, { now: new Date(), clipboard, prompts });
    if (!plan.ok) {
      toast.error(plan.reason === "empty-name"
        ? `A name in the folder template is empty after filling in: ${plan.sourcePath}. Nothing was created.`
        : `Two items in the folder template would both be named ${plan.targetPath}. Nothing was created.`);
      return null;
    }

    const topPath = destinationPath ? `${destinationPath}/${plan.topName}` : plan.topName;
    let destination: FileSystemDirectoryHandle;
    try {
      destination = await directoryAtPath(vault, destinationPath);
    } catch {
      toast.error(`${destinationPath || "The vault"} no longer exists. Nothing was created.`);
      return null;
    }
    if (await entryExists(destination, plan.topName)) {
      toast.error(`${topPath} already exists. Nothing was created.`);
      return null;
    }

    // Optimistic: the rows and the spinner show now; the writes follow.
    const prefix = (path: string) => (destinationPath ? `${destinationPath}/${path}` : path);
    const runId = `scaffold-${++runCounter}`;
    store.set(atom_addPendingTree, [runId, {
      files: plan.entries.filter((e) => e.kind === "file").map((e) => prefix(e.path)),
      folders: plan.entries.filter((e) => e.kind === "folder").map((e) => prefix(e.path)),
    }]);
    store.set(atom_markBusy, [[topPath, { op: "create" }]]);
    void holdVaultSync(() => runWrites(vault, destination, destinationPath, topPath, plan, runId))
      .catch((err) => console.error("Folder template follow-up failed:", err));
    return topPath;
  }, [store, dialog, askPrompts, runWrites]);

  return { newFromFolderTemplate };
}
