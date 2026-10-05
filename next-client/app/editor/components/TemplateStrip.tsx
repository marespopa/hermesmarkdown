"use client";

import React, { useMemo } from "react";
import { useAtomValue } from "jotai";
import type { EditorView } from "@codemirror/view";
import Button from "@/app/components/Button";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import { useDialog } from "@/app/hooks/use-dialog";
import { lintTemplate } from "@/app/utils/templates/template-lint";
import { setTemplateTargetFolder, splitTemplate } from "@/app/utils/templates/template-frontmatter";

interface TemplateStripProps {
  /** Template name (file name without .md). */
  name: string;
  /** The template's raw text. */
  doc: string;
  /** The editor showing it; edits go through it so undo works. */
  view: EditorView | null;
  /** Opens the field menu at the caret. */
  onAddField: () => void;
}

const DEFAULT_VALUE = "__default__";
const NEW_FOLDER_VALUE = "__new__";

// Every folder that holds a note, ancestors included, minus app and
// template folders.
function vaultFolders(paths: string[], templatesFolder: string): string[] {
  const folders = new Set<string>();
  for (const path of paths) {
    const parts = path.split("/").slice(0, -1);
    for (let i = 1; i <= parts.length; i++) folders.add(parts.slice(0, i).join("/"));
  }
  return [...folders]
    .filter((f) => !f.startsWith(".") && f !== templatesFolder && !f.startsWith(`${templatesFolder}/`))
    .sort((a, b) => a.localeCompare(b));
}

// Replaces `view`'s text with `next` as one change spanning only what differs.
function applyText(view: EditorView, next: string) {
  const current = view.state.doc.toString();
  if (current === next) return;
  let start = 0;
  while (start < current.length && start < next.length && current[start] === next[start]) start++;
  let endCur = current.length;
  let endNext = next.length;
  while (endCur > start && endNext > start && current[endCur - 1] === next[endNext - 1]) {
    endCur--;
    endNext--;
  }
  view.dispatch({ changes: { from: start, to: endCur, insert: next.slice(start, endNext) }, userEvent: "input.template" });
}

// One quiet line at the top of a template note ("Editing template: Name"):
// where notes made from it go
// (its target_folder, chosen from a list instead of typed as YAML), an Add
// field button, and plain-language warnings.
export default function TemplateStrip({ name, doc, view, onAddField }: TemplateStripProps) {
  const dialog = useDialog();
  const metadata = useAtomValue(atom_fileMetadata);
  const templatesFolder = useAtomValue(atom_templatesFolder).folder;
  const warnings = useMemo(() => lintTemplate(doc), [doc]);
  const target = useMemo(() => splitTemplate(doc).routing.targetFolder, [doc]);

  const chooseFolder = async () => {
    if (!view) return;
    const options = [
      { label: "Your New Notes folder (default)", value: DEFAULT_VALUE },
      ...vaultFolders(Object.keys(metadata), templatesFolder).map((folder) => ({ label: folder, value: folder })),
      { label: "+ New folder…", value: NEW_FOLDER_VALUE },
    ];
    let chosen: string | null = await dialog.select("Where should notes made from this template go?", options, "New notes go in");
    if (!chosen) return;
    if (chosen === NEW_FOLDER_VALUE) {
      chosen = String((await dialog.prompt("Folder name (it's created with the first note):", "", "New folder")) ?? "")
        .trim()
        .replace(/^\/+|\/+$/g, "");
      if (!chosen) return;
    }
    if (!view.dom.isConnected) return;
    applyText(view, setTemplateTargetFolder(view.state.doc.toString(), chosen === DEFAULT_VALUE ? null : chosen));
  };

  return (
    <div className="mb-3 border-b border-edge-subtle pb-1 font-sans text-ui-caption text-fg-muted" aria-label="Template">
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="min-w-0 truncate">
          Editing template: <span className="font-medium text-fg">{name}</span>
        </span>
        <span aria-hidden>·</span>
        <span className="flex min-w-0 items-center gap-1">
          New notes go in
          <Button
            variant="bare"
            onClick={() => { void chooseFolder(); }}
            className="min-h-11 min-w-0 px-1 text-fg"
            aria-label={`New notes go in ${target ?? "your New Notes folder"}. Change`}
          >
            <span className="truncate">{target ? `${target}/` : "New Notes folder"}</span>
            <span aria-hidden className="ml-1 text-fg-faint">▾</span>
          </Button>
        </span>
        <Button variant="bare" onClick={onAddField} className="ml-auto min-h-11 shrink-0 px-2 text-sage">
          + Add field
        </Button>
      </div>
      {warnings.length > 0 && (
        <ul className="space-y-0.5 pb-1" aria-label="Template warnings">
          {warnings.map((warning) => <li key={warning}>⚠ {warning}</li>)}
        </ul>
      )}
    </div>
  );
}
