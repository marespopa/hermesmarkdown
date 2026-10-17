"use client";

import React, { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { HiOutlineTemplate, HiOutlineViewBoards } from "react-icons/hi";
import Button from "@/app/components/Button";
import TemplateIcon from "@/app/components/TemplateDialog/TemplateIcon";
import { atom_templates } from "@/app/atoms/template-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { STARTER_TEMPLATES } from "@/app/utils/templates/template-packs";
import type { TemplateEntry } from "@/app/utils/templates/template-registry";

interface EmptyNoteTemplatesProps {
  /** True while the note is empty (and not a template). */
  isEmpty: boolean;
  /** Fills the note from a vault template, or a built-in starter. */
  onPick: (template: TemplateEntry) => void;
  /** Opens the full template picker; offered when there are more templates than pills. */
  onMore?: () => void;
  /** Turns the note into a drawing board (a new board file for the draft). */
  onBoard?: () => void;
}

const MAX_PILLS = 4;
const FADE_MS = 150;
const PILL_CLASS = "pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-edge-subtle bg-[color:color-mix(in_srgb,var(--chrome)_70%,transparent)] px-3 font-sans text-ui-footnote text-fg-muted backdrop-blur-sm transition-[background-color,color] duration-150 hover:bg-chrome hover:text-fg sm:min-h-9";

// Soft pills resting under the first line of an empty note: one click fills
// the note from one of the vault's templates. With none yet (or no vault at
// all), a few built-in starters fill it instead, plus a "Browse template
// packs" pill to the Templates page when there's a vault to add them to; a
// Board pill (vault only: it creates a file) starts a drawing board instead
// of text. They fade out as soon as the note has text.
export default function EmptyNoteTemplates({ isEmpty, onPick, onMore, onBoard }: EmptyNoteTemplatesProps) {
  const templates = useAtomValue(atom_templates);
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const router = useRouter();
  // Stays mounted for the fade-out, then unmounts.
  const [mounted, setMounted] = useState(isEmpty);
  useEffect(() => {
    if (isEmpty) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(timer);
  }, [isEmpty]);

  if (!mounted) return null;
  const hasMore = templates.length > MAX_PILLS && onMore;
  const shown = templates.length > 0 ? templates : STARTER_TEMPLATES;

  return (
    <div
      className="template-quick-pills pointer-events-none absolute inset-x-0 z-10 flex flex-wrap gap-2"
      style={{ top: "calc(var(--editor-font-size, 1rem) * 2.4)" }}
      data-state={isEmpty ? "open" : "closed"}
      aria-label="Start from a template"
      role="group"
    >
      {shown.slice(0, MAX_PILLS).map((template) => (
        <Button key={template.path} variant="unstyled" onClick={() => onPick(template)} className={PILL_CLASS}>
          <TemplateIcon name={template.name} size={14} />
          {template.name}
        </Button>
      ))}
      {templates.length === 0 && hasVault && (
        <Button variant="unstyled" onClick={() => router.push("/editor/templates")} className={PILL_CLASS}>
          <HiOutlineTemplate size={14} aria-hidden />
          Browse template packs
        </Button>
      )}
      {onBoard && hasVault && (
        <Button variant="unstyled" onClick={onBoard} className={PILL_CLASS}>
          <HiOutlineViewBoards size={14} aria-hidden />
          Board
        </Button>
      )}
      {hasMore && (
        <Button
          variant="unstyled"
          onClick={onMore}
          className="pointer-events-auto inline-flex min-h-11 items-center rounded-full px-3 font-sans text-ui-footnote text-fg-faint hover:text-fg sm:min-h-9"
        >
          More…
        </Button>
      )}
    </div>
  );
}
