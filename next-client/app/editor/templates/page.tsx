"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { HiOutlinePlus } from "react-icons/hi";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_folderTemplates, atom_templates, atom_templatesFolder, type TemplateWizardPreset } from "@/app/atoms/template-atoms";
import { atom_vaultFolderPaths, atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { useTemplatePacks } from "@/app/hooks/file-system/use-template-packs";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { groupTemplatePacks, type FolderTemplate, type TemplateEntry, type TemplatePack } from "@/app/utils/templates/template-registry";
import ActionButton from "./components/ActionButton";
import FolderTemplateList from "./components/FolderTemplateList";
import PackSection from "./components/PackSection";
import TemplateExamples from "./components/TemplateExamples";
import ShellPage from "../components/ShellPage";
import { editorFileHref } from "../utils/editor-url";
import { usePendingActions } from "./use-pending-actions";

// How to make your own template, in the documentation.
const HELP = { href: "/documentation#templates-page", label: "How to make your own template" };

// Templates: the ones you make, to start new notes and folders from. New
// template (the template wizard) leads; your templates follow, grouped by
// pack (a folder in templates/), then your folder templates, each with Edit
// and Delete; then the few built-in examples, each opening the wizard on it.
// Edit opens the file in the editor and goes back there; the pack actions
// stay on this page. Templates are used from a note, with /template. Every
// action runs once at a time per item (usePendingActions): its buttons are
// disabled and the clicked one spins until it settles. The title bar's (?)
// links to the documentation.
export default function TemplatesPage() {
  const router = useRouter();
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const metadata = useAtomValue(atom_fileMetadata);
  const folderPaths = useAtomValue(atom_vaultFolderPaths);
  const templates = useAtomValue(atom_templates);
  const { folder } = useAtomValue(atom_templatesFolder);
  const { openFile, scanVault, indexVaultTags, newTemplate } = useFileSystem();
  const { duplicatePack, deletePack, deleteTemplate, deleteFolderTemplate } = useTemplatePacks();

  const hasFiles = Object.keys(metadata).length > 0;
  const folderTemplates = useAtomValue(atom_folderTemplates);
  const packs = useMemo(
    () => groupTemplatePacks(folder, templates, folderPaths, new Set(folderTemplates.map((t) => t.name))),
    [folder, templates, folderPaths, folderTemplates],
  );
  const hasOwn = packs.length > 0 || folderTemplates.length > 0;
  const { run, pendingAction } = usePendingActions();
  const wizardPending = pendingAction("wizard");

  // Opened straight on this page (a reload), the vault hasn't been read yet.
  useEffect(() => {
    if (!vaultHandle || hasFiles) return;
    void scanVault(vaultHandle).then(() => indexVaultTags());
  }, [vaultHandle]); // eslint-disable-line react-hooks/exhaustive-deps

  const toEditor = () => router.push("/editor");

  const openInEditor = (scope: string, path: string) =>
    run(scope, "edit", async () => {
      if (!vaultHandle) return;
      await openFile(await resolveFileHandleAtPath(vaultHandle, path), path, true);
      router.push(editorFileHref(path));
    });

  // The wizard opens what it made; the editor shows it. One wizard at a time:
  // New template and every example wait while it's open.
  const startTemplate = (preset?: TemplateWizardPreset) =>
    run("wizard", preset?.from ?? "new", async () => {
      if (await newTemplate(preset)) toEditor();
    });

  const packScope = (pack: TemplatePack) => `pack:${pack.folder}`;
  // A pack's New: the wizard, a note template in that pack.
  const newInPack = (pack: TemplatePack) =>
    run(packScope(pack), "new", async () => {
      if (await newTemplate({ kind: "note", ...(pack.name ? { pack: pack.name } : {}) })) toEditor();
    });

  return (
    <ShellPage title="Templates" help={HELP}>
      <main className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto w-full max-w-3xl space-y-10 px-4 py-8 sm:px-8">
          <div className="space-y-4">
            <div>
              <h1 className="text-ui-title-2 font-semibold tracking-tight">Templates</h1>
              <p className="mt-1 text-ui-footnote text-fg-muted">
                Make your own: a note to start new notes from, or a whole folder of notes. Each one is a plain file
                in <code>{folder}/</code> you can change any time.
              </p>
            </div>
            {vaultHandle && (
              <div className="flex flex-wrap items-center gap-2">
                <ActionButton
                  variant="primary"
                  onClick={() => void startTemplate()}
                  pending={wizardPending === "new"}
                  isDisabled={!!wizardPending}
                  icon={<HiOutlinePlus size={16} aria-hidden />}
                  label="New template"
                />
              </div>
            )}
          </div>

          {!vaultHandle ? (
            <p className="rounded-xl border border-edge-subtle bg-surface px-4 py-3 text-ui-footnote text-fg-muted">
              Open a vault in the editor to make and manage templates. They live in your vault as plain files.
            </p>
          ) : (
            <section aria-labelledby="your-templates" className="space-y-3">
              <h2 id="your-templates" className="text-ui-headline font-semibold">Your templates</h2>
              {!hasOwn ? (
                <p className="rounded-xl border border-dashed border-edge-subtle px-4 py-6 text-center text-ui-footnote text-fg-muted">
                  No templates yet. Make one with New template: start blank, from a folder you already have, or from an
                  example below.
                </p>
              ) : (
                <>
                  {packs.map((pack) => (
                    <PackSection
                      key={pack.folder}
                      pack={pack}
                      onEdit={(template: TemplateEntry) => void openInEditor(`template:${template.path}`, template.path)}
                      onNewTemplate={(target) => void newInPack(target)}
                      onDuplicate={(target) => void run(packScope(target), "duplicate", () => duplicatePack(target))}
                      onDelete={(target) => void run(packScope(target), "delete", () => deletePack(target))}
                      onDeleteTemplate={(template) =>
                        void run(`template:${template.path}`, "delete", () => deleteTemplate(template))}
                      pending={pendingAction(packScope(pack))}
                      templatePending={(template) => pendingAction(`template:${template.path}`)}
                    />
                  ))}
                  {folderTemplates.length > 0 && (
                    <FolderTemplateList
                      templates={folderTemplates}
                      onEdit={(template: FolderTemplate) => void openInEditor(`folder:${template.folder}`, template.readmePath)}
                      onDelete={(template) =>
                        void run(`folder:${template.folder}`, "delete", () => deleteFolderTemplate(template))}
                      pendingOf={(template) => pendingAction(`folder:${template.folder}`)}
                    />
                  )}
                </>
              )}
            </section>
          )}

          <section aria-labelledby="template-examples" className="space-y-3">
            <div>
              <h2 id="template-examples" className="text-ui-headline font-semibold">Examples</h2>
              <p className="mt-1 text-ui-footnote text-fg-muted">
                Start a template of your own from one of these: it&apos;s copied into <code>{folder}/</code> under the
                name you give it. They also work as they are, from /template and New from folder template.
              </p>
            </div>
            <TemplateExamples
              onStart={(preset) => void startTemplate(preset)}
              disabled={!vaultHandle || !!wizardPending}
              pending={wizardPending}
            />
          </section>
        </div>
      </main>
    </ShellPage>
  );
}
