"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_templateDialog, atom_templates, atom_templatesFolder } from "@/app/atoms/template-atoms";
import TemplatePicker from "./TemplatePicker";
import TemplatePromptForm from "./TemplatePromptForm";
import { TEMPLATE_STARTERS } from "@/app/utils/templates/template-starter";
import { useTemplateNotes } from "@/app/hooks/file-system/use-template-notes";
import { useOpenFile } from "@/app/hooks/file-system/use-open-file";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import type { TemplateEntry } from "@/app/utils/templates/template-registry";
import toast from "react-hot-toast";
import { useStore } from "jotai";

const STARTER_BODIES = Object.fromEntries(TEMPLATE_STARTERS.map((starter) => [starter.name, starter.body]));

// Renders the open template request (useTemplateDialog): the template
// picker, the starter picker or the prompts form. Mounted once, next to GlobalDialog.
export default function TemplateDialogHost() {
  const request = useAtomValue(atom_templateDialog);
  const templates = useAtomValue(atom_templates);
  const { folder } = useAtomValue(atom_templatesFolder);
  // A fresh dialog (empty search / fields) for every request, even back to back.
  const ids = useRef(new WeakMap<object, number>());
  const nextId = useRef(0);
  const { readTemplate } = useTemplateNotes();
  const { openFile } = useOpenFile();
  const store = useStore();
  // Edit from the picker: cancel what asked for it, then open the file.
  const editTemplate = async (entry: TemplateEntry, cancel: () => void) => {
    cancel();
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return;
    try {
      await openFile(await resolveFileHandleAtPath(vaultHandle, entry.path), entry.path, true);
    } catch (err: any) {
      console.warn("Failed to open template:", err?.message || err);
      toast.error(`Couldn't open template ${entry.name}`);
    }
  };
  // Template texts for the picker's summaries and preview, read when it opens.
  const [bodies, setBodies] = useState<Record<string, string | null>>({});
  const isPicking = request?.kind === "pick";
  useEffect(() => {
    if (!isPicking) return;
    let cancelled = false;
    setBodies(Object.fromEntries(templates.map((t) => [t.path, null])));
    void Promise.all(
      templates.map(async (t) => [t.path, await readTemplate(t).catch(() => "")] as const),
    ).then((entries) => {
      if (!cancelled) setBodies(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [isPicking, request, templates, readTemplate]);

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
        bodies={bodies}
        onEdit={(entry) => { void editTemplate(entry, () => request.resolve(null)); }}
        onPick={(value) => request.resolve(value)}
        onCancel={() => request.resolve(null)}
      />
    );
  }

  if (request.kind === "starter") {
    return (
      <TemplatePicker
        key={key}
        isOpen
        title="New template"
        templates={TEMPLATE_STARTERS}
        bodies={STARTER_BODIES}
        folder={folder}
        includeBlank={false}
        onPick={(value) => request.resolve(value === "blank" ? null : value)}
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
