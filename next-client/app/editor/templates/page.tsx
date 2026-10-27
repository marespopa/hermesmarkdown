"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { HiOutlineFolderAdd, HiOutlinePlus } from "react-icons/hi";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_folderTemplates, atom_templates, atom_templatesFolder } from "@/app/atoms/template-atoms";
import { atom_vaultFolderPaths, atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import { useTemplatePacks } from "@/app/hooks/file-system/use-template-packs";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { BUILTIN_FOLDER_TEMPLATES } from "@/app/utils/templates/template-folders";
import { BUILTIN_PACKS, packTemplatesInVault, type BuiltinPack } from "@/app/utils/templates/template-packs";
import { groupTemplatePacks, type TemplateEntry, type TemplatePack } from "@/app/utils/templates/template-registry";
import BuiltinPackCard from "./components/BuiltinPackCard";
import PackSection from "./components/PackSection";
import ShellPage from "../components/ShellPage";
import { editorFileHref } from "../utils/editor-url";

// Templates: everything new notes start from. Your templates, grouped by
// pack (a folder in templates/), each with Edit and Delete, and the packs the app
// ships, each with Add to vault. Edit opens the template in the editor and
// goes back there; the pack actions stay on this page. Templates are used
// from a note, with /template.
export default function TemplatesPage() {
  const router = useRouter();
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const metadata = useAtomValue(atom_fileMetadata);
  const folderPaths = useAtomValue(atom_vaultFolderPaths);
  const templates = useAtomValue(atom_templates);
  const { folder } = useAtomValue(atom_templatesFolder);
  const { openFile, scanVault, indexVaultTags, createTemplate } = useFileSystem();
  const { addBuiltinPack, createPack, duplicatePack, deletePack, deleteTemplate } = useTemplatePacks();

  const paths = useMemo(() => Object.keys(metadata), [metadata]);
  const folderTemplates = useAtomValue(atom_folderTemplates);
  const packs = useMemo(
    () => groupTemplatePacks(folder, templates, folderPaths, new Set(folderTemplates.map((t) => t.name))),
    [folder, templates, folderPaths, folderTemplates],
  );

  // Opened straight on this page (a reload), the vault hasn't been read yet.
  useEffect(() => {
    if (!vaultHandle || paths.length > 0) return;
    void scanVault(vaultHandle).then(() => indexVaultTags());
  }, [vaultHandle]); // eslint-disable-line react-hooks/exhaustive-deps

  const toEditor = () => router.push("/editor");

  const edit = async (template: TemplateEntry) => {
    if (!vaultHandle) return;
    await openFile(await resolveFileHandleAtPath(vaultHandle, template.path), template.path, true);
    router.push(editorFileHref(template.path));
  };

  const newTemplate = async (pack?: TemplatePack) => {
    if (await createTemplate(pack?.name || undefined)) toEditor();
  };

  return (
    <ShellPage title="Templates">
      <main className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto w-full max-w-3xl space-y-10 px-4 py-8 sm:px-8">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-ui-title-2 font-semibold tracking-tight">Templates</h1>
              <p className="mt-1 text-ui-footnote text-fg-muted">
                Every new note can start from a template: a Markdown file in <code>{folder}/</code>. A pack is a folder of
                templates in it.
              </p>
            </div>
            {vaultHandle && (
              <div className="flex items-center">
                <Button variant="small" onClick={() => void newTemplate()}>
                  <HiOutlinePlus size={14} aria-hidden /> New template
                </Button>
                <Button variant="small" onClick={() => void createPack()}>
                  <HiOutlineFolderAdd size={14} aria-hidden /> New pack
                </Button>
              </div>
            )}
          </div>

          {!vaultHandle ? (
            <p className="rounded-xl border border-edge-subtle bg-surface px-4 py-3 text-ui-footnote text-fg-muted">
              Open a vault in the editor to use and manage templates. They live in your vault as plain files.
            </p>
          ) : (
            <section aria-labelledby="your-templates" className="space-y-3">
              <h2 id="your-templates" className="text-ui-headline font-semibold">Your templates</h2>
              {packs.length === 0 ? (
                <p className="text-ui-footnote text-fg-muted">No templates yet. Add a pack below, or start one with New template.</p>
              ) : (
                packs.map((pack) => (
                  <PackSection
                    key={pack.folder}
                    pack={pack}
                    onEdit={(template) => void edit(template)}
                    onNewTemplate={(target) => void newTemplate(target)}
                    onDuplicate={(target) => void duplicatePack(target)}
                    onDelete={(target) => void deletePack(target)}
                    onDeleteTemplate={(template) => void deleteTemplate(template)}
                  />
                ))
              )}
            </section>
          )}

          <section aria-labelledby="template-packs" className="space-y-3">
            <div>
              <h2 id="template-packs" className="text-ui-headline font-semibold">Template packs</h2>
              <p className="mt-1 text-ui-footnote text-fg-muted">
                Adding a pack copies its templates into <code>{folder}/</code> as files you can edit. Files you already have
                are never replaced.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {BUILTIN_PACKS.map((pack: BuiltinPack) => (
                <BuiltinPackCard
                  key={pack.id}
                  pack={pack}
                  inVault={packTemplatesInVault(pack, folder, paths)}
                  onAdd={addBuiltinPack}
                  disabled={!vaultHandle}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="folder-templates" className="space-y-3">
            <div>
              <h2 id="folder-templates" className="text-ui-headline font-semibold">Folder templates</h2>
              <p className="mt-1 text-ui-footnote text-fg-muted">
                A folder template makes a whole folder of notes at once. These are ready to use with New from folder
                template, without adding anything to your vault. Copy one into <code>{folder}/</code> only to change it;
                files you already have are never replaced.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {BUILTIN_FOLDER_TEMPLATES.map((pack) => (
                <BuiltinPackCard
                  key={pack.id}
                  pack={pack}
                  inVault={packTemplatesInVault(pack, folder, paths)}
                  onAdd={addBuiltinPack}
                  addLabel="Copy to vault"
                  disabled={!vaultHandle}
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </ShellPage>
  );
}
