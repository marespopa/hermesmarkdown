"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_templateDialog, atom_templates, atom_templatesFolder } from "@/app/atoms/template-atoms";
import TemplatePicker from "./TemplatePicker";
import TemplatePromptForm from "./TemplatePromptForm";
import TemplateWizard from "./TemplateWizard";
import { useTemplateNotes } from "@/app/hooks/file-system/use-template-notes";
import { useOpenFile } from "@/app/hooks/file-system/use-open-file";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { atom_vaultFolderPaths } from "@/app/atoms/vault-atoms";
import { builtinNoteTemplates } from "@/app/utils/templates/template-packs";
import { BUILTIN_FOLDER_TEMPLATES } from "@/app/utils/templates/template-folders";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import type { TemplateEntry } from "@/app/utils/templates/template-registry";
import toast from "react-hot-toast";
import { useStore } from "jotai";

// Renders the open template request (useTemplateDialog): the template
// picker, the prompts form or the template wizard. Mounted once, next to
// GlobalDialog. The picker lists the vault's templates, then the built-in
// examples (read from memory, never written unless Edit copies one in).
export default function TemplateDialogHost() {
  const request = useAtomValue(atom_templateDialog);
  const vaultTemplates = useAtomValue(atom_templates);
  const templates = useMemo(() => [...vaultTemplates, ...builtinNoteTemplates(vaultTemplates)], [vaultTemplates]);
  const hasFolders = useAtomValue(atom_vaultFolderPaths).some((path) => !path.split("/").some((s) => s.startsWith("_") || s.startsWith(".")));
  const { createTemplate } = useFileSystem();
  const { folder } = useAtomValue(atom_templatesFolder);
  // A fresh dialog (empty search / fields) for every request, even back to back.
  const ids = useRef(new WeakMap<object, number>());
  const nextId = useRef(0);
  const { readTemplate } = useTemplateNotes();
  const { openFile } = useOpenFile();
  const store = useStore();
  // Edit from the picker: cancel what asked for it, then open the file.
  // A built-in is copied into the vault first: changing it is opt-in.
  const editTemplate = async (entry: TemplateEntry, cancel: () => void) => {
    cancel();
    if (entry.body !== undefined) {
      await createTemplate(undefined, { name: entry.name, body: entry.body });
      return;
    }
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return;
    try {
      await openFile(await resolveFileHandleAtPath(vaultHandle, entry.path), entry.path, true);
    } catch (err: any) {
      console.warn("Failed to open template:", err?.message || err);
      toast.error(`Couldn't open template ${entry.name}`);
    }
  };
  // Template texts for the picker's summaries and preview, read when it
  // opens, each shown as soon as it arrives (one slow file doesn't hold up
  // the rest). A picked template carries its text along, so inserting it
  // doesn't read the file again behind the other reads.
  const [bodies, setBodies] = useState<Record<string, string | null>>({});
  const isPicking = request?.kind === "pick";
  useEffect(() => {
    if (!isPicking) return;
    let cancelled = false;
    setBodies(Object.fromEntries(templates.map((t) => [t.path, null])));
    for (const t of templates) {
      void readTemplate(t).catch(() => "").then((text) => {
        if (!cancelled) setBodies((previous) => ({ ...previous, [t.path]: text }));
      });
    }
    return () => { cancelled = true; };
  }, [isPicking, request, templates, readTemplate]);
  const withBody = (value: TemplateEntry | "blank" | "board" | null) => {
    if (!value || typeof value === "string" || value.body !== undefined) return value;
    const text = bodies[value.path];
    return text ? { ...value, body: text } : value;
  };

  if (!request) return null;
  if (!ids.current.has(request)) ids.current.set(request, ++nextId.current);
  const key = ids.current.get(request);

  if (request.kind === "pick") {
    return (
      <TemplatePicker
        key={key}
        isOpen
        title={request.title}
        templates={templates}
        folder={folder}
        includeBlank={request.includeBlank}
        preselect={request.preselect}
        bodies={bodies}
        onEdit={(entry) => { void editTemplate(entry, () => request.resolve(null)); }}
        onPick={(value) => request.resolve(withBody(value))}
        onCancel={() => request.resolve(null)}
      />
    );
  }

  if (request.kind === "wizard") {
    return (
      <TemplateWizard
        key={key}
        isOpen
        noteExamples={builtinNoteTemplates([]).map((t) => ({ id: t.path, name: t.name, description: t.description }))}
        folderExamples={BUILTIN_FOLDER_TEMPLATES.map((pack) => ({ id: pack.id, name: pack.displayName ?? pack.name, description: pack.description }))}
        canCopyFolder={hasFolders}
        onSubmit={(result) => request.resolve(result)}
        onCancel={() => request.resolve(null)}
      />
    );
  }

  return (
    <TemplatePromptForm
      key={key}
      isOpen
      labels={request.labels}
      confirmLabel={request.confirmLabel}
      onSubmit={(values) => request.resolve(values)}
      onCancel={() => request.resolve(null)}
    />
  );
}
