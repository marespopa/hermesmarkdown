"use client";

import React from "react";
import { HiOutlineDuplicate, HiOutlinePencil, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi";
import Button from "@/app/components/Button";
import TemplateIcon from "@/app/components/TemplateDialog/TemplateIcon";
import type { TemplateEntry, TemplatePack } from "@/app/utils/templates/template-registry";

export const SMALL_BUTTON_CLASS =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-ui-footnote font-medium text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg disabled:pointer-events-none disabled:opacity-40";

interface PackSectionProps {
  pack: TemplatePack;
  onUse: (template: TemplateEntry) => void;
  onEdit: (template: TemplateEntry) => void;
  onNewTemplate: (pack: TemplatePack) => void;
  onDuplicate: (pack: TemplatePack) => void;
  onDelete: (pack: TemplatePack) => void;
}

// One of your packs (or the loose templates, `pack.name` ""): its name and
// count, New template / Duplicate / Delete (no Delete for the loose ones,
// which aren't a folder of their own), then a row per template with Use
// (make a note from it) and Edit (open the template file).
export default function PackSection({ pack, onUse, onEdit, onNewTemplate, onDuplicate, onDelete }: PackSectionProps) {
  const title = pack.name || "Loose templates";
  const count = pack.templates.length;
  return (
    <section aria-label={title} className="rounded-xl border border-edge-subtle bg-surface">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge-subtle px-4 py-2.5">
        <h3 className="min-w-0 flex-1 truncate text-ui-subhead font-semibold text-fg">
          {title}
          <span className="ml-2 font-normal text-fg-faint">{count === 1 ? "1 template" : `${count} templates`}</span>
        </h3>
        <div className="-mr-1.5 flex items-center">
          <Button variant="unstyled" onClick={() => onNewTemplate(pack)} className={SMALL_BUTTON_CLASS} aria-label={`New template in ${title}`}>
            <HiOutlinePlus size={14} aria-hidden /> New
          </Button>
          <Button variant="unstyled" onClick={() => onDuplicate(pack)} isDisabled={count === 0} className={SMALL_BUTTON_CLASS} aria-label={`Duplicate ${title}`}>
            <HiOutlineDuplicate size={14} aria-hidden /> Duplicate
          </Button>
          {pack.name && (
            <Button variant="unstyled" onClick={() => onDelete(pack)} className={SMALL_BUTTON_CLASS} aria-label={`Delete ${title}`}>
              <HiOutlineTrash size={14} aria-hidden /> Delete
            </Button>
          )}
        </div>
      </header>
      {count === 0 ? (
        <p className="px-4 py-3 text-ui-footnote text-fg-faint">No templates in this pack yet.</p>
      ) : (
        <ul className="divide-y divide-edge-subtle">
          {pack.templates.map((template) => (
            <li key={template.path} className="flex items-center gap-3 px-4 py-2">
              <TemplateIcon name={template.name} className="text-fg-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ui-subhead text-fg">{template.name}</span>
                <span className="block truncate text-ui-caption text-fg-faint">{template.path}</span>
              </span>
              <Button variant="unstyled" onClick={() => onEdit(template)} className={SMALL_BUTTON_CLASS} aria-label={`Edit ${template.name}`}>
                <HiOutlinePencil size={14} aria-hidden /> Edit
              </Button>
              <Button
                variant="unstyled"
                onClick={() => onUse(template)}
                className={`${SMALL_BUTTON_CLASS} bg-surface-raised text-fg`}
                aria-label={`Use ${template.name}`}
              >
                Use
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
