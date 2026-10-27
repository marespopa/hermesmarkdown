"use client";

import React from "react";
import { HiOutlineDuplicate, HiOutlinePencil, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi";
import ActionButton from "./ActionButton";
import TemplateIcon from "@/app/components/TemplateDialog/TemplateIcon";
import type { TemplateEntry, TemplatePack } from "@/app/utils/templates/template-registry";

interface PackSectionProps {
  pack: TemplatePack;
  onEdit: (template: TemplateEntry) => void;
  onNewTemplate: (pack: TemplatePack) => void;
  onDuplicate: (pack: TemplatePack) => void;
  onDelete: (pack: TemplatePack) => void;
  onDeleteTemplate: (template: TemplateEntry) => void;
  /** The pack action under way ("new", "duplicate", "delete"): its buttons wait. */
  pending?: string;
  /** The action under way on one template ("edit", "delete"), if any. */
  templatePending?: (template: TemplateEntry) => string | undefined;
}

// The group of templates directly in templates/, outside any pack folder.
export const NO_PACK_TITLE = "Not in a pack";

// One of your packs (or the templates in no pack, `pack.name` ""): its name
// and count, New template / Duplicate / Delete (no Delete for the templates
// in no pack, which aren't a folder of their own), then a row per template
// with Edit (open the template file) and Delete (just that file). While an
// action runs, the pack's (or the template's) buttons are disabled and the
// clicked one spins, so it can't run twice.
export default function PackSection({
  pack,
  onEdit,
  onNewTemplate,
  onDuplicate,
  onDelete,
  onDeleteTemplate,
  pending,
  templatePending = () => undefined,
}: PackSectionProps) {
  const title = pack.name || NO_PACK_TITLE;
  const count = pack.templates.length;
  return (
    <section aria-label={title} className="rounded-xl border border-edge-subtle bg-surface">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge-subtle px-4 py-2.5">
        <h3 className="min-w-0 flex-1 truncate text-ui-subhead font-semibold text-fg">
          {title}
          <span className="ml-2 font-normal text-fg-faint">{count === 1 ? "1 template" : `${count} templates`}</span>
        </h3>
        <div className="-mr-1.5 flex items-center">
          <ActionButton
            onClick={() => onNewTemplate(pack)}
            pending={pending === "new"}
            isDisabled={!!pending}
            aria-label={`New template in ${title}`}
            icon={<HiOutlinePlus size={14} aria-hidden />}
            label="New"
          />
          <ActionButton
            onClick={() => onDuplicate(pack)}
            pending={pending === "duplicate"}
            isDisabled={count === 0 || !!pending}
            aria-label={`Duplicate ${title}`}
            icon={<HiOutlineDuplicate size={14} aria-hidden />}
            label="Duplicate"
          />
          {pack.name && (
            <ActionButton
              onClick={() => onDelete(pack)}
              pending={pending === "delete"}
              isDisabled={!!pending}
              aria-label={`Delete ${title}`}
              icon={<HiOutlineTrash size={14} aria-hidden />}
              label="Delete"
            />
          )}
        </div>
      </header>
      {count === 0 ? (
        <p className="px-4 py-3 text-ui-footnote text-fg-faint">No templates in this pack yet.</p>
      ) : (
        <ul className="divide-y divide-edge-subtle">
          {pack.templates.map((template) => {
            const busy = templatePending(template) ?? (pending === "delete" ? "pack" : undefined);
            return (
            <li key={template.path} className="flex items-center gap-3 px-4 py-2">
              <TemplateIcon name={template.name} className="text-fg-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ui-subhead text-fg">{template.name}</span>
                <span className="block truncate text-ui-caption text-fg-faint">{template.path}</span>
              </span>
              <ActionButton
                onClick={() => onEdit(template)}
                pending={busy === "edit"}
                isDisabled={!!busy}
                aria-label={`Edit ${template.name}`}
                icon={<HiOutlinePencil size={14} aria-hidden />}
                label="Edit"
              />
              <ActionButton
                onClick={() => onDeleteTemplate(template)}
                pending={busy === "delete"}
                isDisabled={!!busy}
                aria-label={`Delete template ${template.name}`}
                icon={<HiOutlineTrash size={14} aria-hidden />}
                label="Delete"
              />
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
