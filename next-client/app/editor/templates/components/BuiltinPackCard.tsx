"use client";

import React from "react";
import { HiOutlineCheck, HiOutlineDownload } from "react-icons/hi";
import Button from "@/app/components/Button";
import TemplateIcon from "@/app/components/TemplateDialog/TemplateIcon";
import type { BuiltinPack } from "@/app/utils/templates/template-packs";
import { SMALL_BUTTON_CLASS } from "./PackSection";

interface BuiltinPackCardProps {
  pack: BuiltinPack;
  /** Names of the pack's templates already in the vault (packTemplatesInVault). */
  inVault: Set<string>;
  onAdd: (pack: BuiltinPack) => void;
  /** Without a vault there is nowhere to add it. */
  disabled?: boolean;
}

// A pack the app ships: its name, what it's for, its templates, and Add to
// vault (Add missing when some files are there already, Added when all are).
export default function BuiltinPackCard({ pack, inVault, onAdd, disabled = false }: BuiltinPackCardProps) {
  const missing = pack.templates.length - inVault.size;
  const added = missing === 0;
  const label = added ? "Added" : inVault.size > 0 ? `Add ${missing} missing` : "Add to vault";
  return (
    <section aria-label={`${pack.name} pack`} className="flex flex-col rounded-xl border border-edge-subtle bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-ui-subhead font-semibold text-fg">{pack.name}</h3>
          <p className="mt-0.5 text-ui-footnote text-fg-muted">{pack.description}</p>
        </div>
        <Button
          variant="unstyled"
          onClick={() => onAdd(pack)}
          isDisabled={added || disabled}
          className={`${SMALL_BUTTON_CLASS} ${added ? "" : "bg-surface-raised text-fg"}`}
          aria-label={`${label}: ${pack.name}`}
        >
          {added ? <HiOutlineCheck size={14} aria-hidden /> : <HiOutlineDownload size={14} aria-hidden />}
          {label}
        </Button>
      </div>
      <ul className="mt-3 space-y-1.5">
        {pack.templates.map((template) => (
          <li key={template.name} className="flex items-start gap-2.5">
            <TemplateIcon name={template.name} size={14} className="mt-0.5 text-fg-faint" />
            <span className="min-w-0 text-ui-footnote">
              <span className="text-fg">{template.name}</span>
              <span className="text-fg-faint"> · {template.description}</span>
              {inVault.has(template.name) && <span className="text-fg-faint"> · in your vault</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
