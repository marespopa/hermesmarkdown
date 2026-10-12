"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { HiOutlineArrowLeft, HiOutlineFolderAdd, HiOutlinePlus } from "react-icons/hi";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_templates, atom_templatesFolder } from "@/app/atoms/template-atoms";
import { atom_vaultFolderPaths, atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import { useTemplatePacks } from "@/app/hooks/file-system/use-template-packs";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { BUILTIN_PACKS, packTemplatesInVault, type BuiltinPack } from "@/app/utils/templates/template-packs";
import { groupTemplatePacks, type TemplateEntry, type TemplatePack } from "@/app/utils/templates/template-registry";
import BuiltinPackCard from "./components/BuiltinPackCard";
import PackSection, { SMALL_BUTTON_CLASS } from "./components/PackSection";

// Templates: everything new notes start from. Your templates, grouped by
// pack (a folder in templates/), each with Use and Edit, and the
// packs the app ships, each with Add to vault. Use and Edit open a note in
// the editor and go back there; the pack actions stay on this page.
export default function TemplatesPage() {
  const router = useRouter();
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const metadata = useAtomValue(atom_fileMetadata);
  const folderPaths = useAtomValue(atom_vaultFolderPaths);
  const templates = useAtomValue(atom_templates);
  const { folder } = useAtomValue(atom_templatesFolder);
  const { openFile, scanVault, indexVaultTags, createNoteFromTemplate, createTemplate } = useFileSystem();
  const { addBuiltinPack, createPack, duplicatePack, deletePack } = useTemplatePacks();

  const paths = useMemo(() => Object.keys(metadata), [metadata]);
  const packs = useMemo(() => groupTemplatePacks(folder, templates, folderPaths), [folder, templates, folderPaths]);

  // Opened straight on this page (a reload), the vault hasn't been read yet.
  useEffect(() => {
    if (!vaultHandle || paths.length > 0) return;
    void scanVault(vaultHandle).then(() => indexVaultTags());
  }, [vaultHandle]); // eslint-disable-line react-hooks/exhaustive-deps

  const toEditor = () => router.push("/editor");

  const use = async (template: TemplateEntry) => {
    if (await createNoteFromTemplate(template)) toEditor();
  };

  const edit = async (template: TemplateEntry) => {
    if (!vaultHandle) return;
    await openFile(await resolveFileHandleAtPath(vaultHandle, template.path), template.path, true);
    toEditor();
  };

  const newTemplate = async (pack?: TemplatePack) => {
    if (await createTemplate(pack?.name || undefined)) toEditor();
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none bg-paper-pale font-sans text-ink-light selection:bg-sage/10 dark:bg-paper-dark dark:text-ink-dark">
      <header className="shrink-0 border-b border-beige/70 px-5 py-4 dark:border-paper-dark sm:px-8">
        <Button
          variant="unstyled"
          onClick={toEditor}
          title="Back to editor"
          className="group inline-flex items-center gap-1.5 text-ui-footnote font-medium text-fg-faint transition-colors hover:text-ink-light focus:outline-none dark:hover:text-ink-dark"
        >
          <HiOutlineArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          Editor
        </Button>
      </header>
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
                <Button variant="unstyled" onClick={() => void newTemplate()} className={SMALL_BUTTON_CLASS}>
                  <HiOutlinePlus size={14} aria-hidden /> New template
                </Button>
                <Button variant="unstyled" onClick={() => void createPack()} className={SMALL_BUTTON_CLASS}>
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
                    onUse={(template) => void use(template)}
                    onEdit={(template) => void edit(template)}
                    onNewTemplate={(target) => void newTemplate(target)}
                    onDuplicate={(target) => void duplicatePack(target)}
                    onDelete={(target) => void deletePack(target)}
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
                  onAdd={(target) => void addBuiltinPack(target)}
                  disabled={!vaultHandle}
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
