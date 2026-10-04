"use client";

import React, { useRef } from "react";
import { useAtomValue } from "jotai";
import { atom_templateDialog, atom_templates, atom_templatesFolder } from "@/app/atoms/template-atoms";
import TemplatePicker from "./TemplatePicker";
import TemplatePromptForm from "./TemplatePromptForm";

// Renders the open template request (useTemplateDialog): the picker or the
// prompts form. Mounted once, next to GlobalDialog.
export default function TemplateDialogHost() {
  const request = useAtomValue(atom_templateDialog);
  const templates = useAtomValue(atom_templates);
  const { folder } = useAtomValue(atom_templatesFolder);
  // A fresh dialog (empty search / fields) for every request, even back to back.
  const ids = useRef(new WeakMap<object, number>());
  const nextId = useRef(0);

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
        onPick={(value) => request.resolve(value)}
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
