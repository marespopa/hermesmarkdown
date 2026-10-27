"use client";

import React from "react";
import { HiOutlineFolder, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import { folderTemplateDisplayName, namePromptLabels } from "@/app/utils/templates/folder-template";
import type { FolderTemplate } from "@/app/utils/templates/template-registry";
import ActionButton from "./ActionButton";

interface FolderTemplateListProps {
  templates: FolderTemplate[];
  onEdit: (template: FolderTemplate) => void;
  onDelete: (template: FolderTemplate) => void;
  /** The action under way on one folder template ("edit", "delete"), if any. */
  pendingOf?: (template: FolderTemplate) => string | undefined;
}

// Your folder templates (folders in templates/ whose README has
// `scaffold: true`): a row each, its name as listed (prompts by their label,
// dates filled in), a line saying whether it asks for the new folder's name, Edit (open the README) and
// Delete (the whole folder). While one runs, that row's buttons are disabled
// and the clicked one spins.
export default function FolderTemplateList({ templates, onEdit, onDelete, pendingOf = () => undefined }: FolderTemplateListProps) {
  const now = new Date();
  return (
    <section aria-label="Folder templates" className="rounded-xl border border-edge-subtle bg-surface">
      <header className="border-b border-edge-subtle px-4 py-2.5">
        <h3 className="text-ui-subhead font-semibold text-fg">
          Folder templates
          <span className="ml-2 font-normal text-fg-faint">
            {templates.length === 1 ? "1 template" : `${templates.length} templates`}
          </span>
        </h3>
      </header>
      <ul className="divide-y divide-edge-subtle">
        {templates.map((template) => {
          const title = folderTemplateDisplayName(template.name, now);
          const asks = namePromptLabels(template.name).length > 0;
          const busy = pendingOf(template);
          return (
            <li key={template.folder} className="flex items-center gap-3 px-4 py-2">
              <HiOutlineFolder size={16} aria-hidden className="shrink-0 text-fg-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ui-subhead text-fg">{title}</span>
                <span className="block truncate text-ui-caption text-fg-faint">
                  {asks ? "Asks for the new folder's name" : template.folder}
                </span>
              </span>
              <ActionButton
                onClick={() => onEdit(template)}
                pending={busy === "edit"}
                isDisabled={!!busy}
                aria-label={`Edit ${title}`}
                icon={<HiOutlinePencil size={14} aria-hidden />}
                label="Edit"
              />
              <ActionButton
                onClick={() => onDelete(template)}
                pending={busy === "delete"}
                isDisabled={!!busy}
                aria-label={`Delete folder template ${title}`}
                icon={<HiOutlineTrash size={14} aria-hidden />}
                label="Delete"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
