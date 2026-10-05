"use client";

import React, { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import Button from "@/app/components/Button";
import TemplateIcon from "@/app/components/TemplateDialog/TemplateIcon";
import { atom_templates } from "@/app/atoms/template-atoms";
import type { TemplateEntry } from "@/app/utils/templates/template-registry";
import { TEMPLATE_STARTERS } from "@/app/utils/templates/template-starter";
import type { TemplateSource } from "../hooks/use-vault-template-insert";

interface EmptyNoteTemplatesProps {
  /** True while the note is empty (and not a template). */
  isEmpty: boolean;
  /** Fills the note from a template or a starter. */
  onPick: (source: TemplateEntry | TemplateSource) => void;
  /** Opens the full template picker; offered when there are more templates than pills. */
  onMore?: () => void;
}

const MAX_PILLS = 4;
const FADE_MS = 150;
// Without vault templates, the starters that make sense as notes.
const STARTER_SOURCES: TemplateSource[] = TEMPLATE_STARTERS
  .filter((starter) => starter.name !== "Basic")
  .map((starter) => ({ name: starter.name, body: starter.body }));

// Soft pills resting under the first line of an empty note: one click fills
// the note from a template. They fade out as soon as the note has text.
export default function EmptyNoteTemplates({ isEmpty, onPick, onMore }: EmptyNoteTemplatesProps) {
  const templates = useAtomValue(atom_templates);
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

  const sources: (TemplateEntry | TemplateSource)[] = templates.length > 0 ? templates : STARTER_SOURCES;
  if (!mounted || sources.length === 0) return null;
  const hasMore = templates.length > MAX_PILLS && onMore;

  return (
    <div
      className="template-quick-pills pointer-events-none absolute inset-x-0 z-10 flex flex-wrap gap-2"
      style={{ top: "calc(var(--editor-font-size, 1rem) * 2.4)" }}
      data-state={isEmpty ? "open" : "closed"}
      aria-label="Start from a template"
      role="group"
    >
      {sources.slice(0, MAX_PILLS).map((source) => (
        <Button
          key={"path" in source ? source.path : source.name}
          variant="unstyled"
          onClick={() => onPick(source)}
          className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-edge-subtle bg-[color:color-mix(in_srgb,var(--chrome)_70%,transparent)] px-3 font-sans text-ui-footnote text-fg-muted backdrop-blur-sm transition-[background-color,color,transform] duration-150 [transition-timing-function:var(--ease-spring)] hover:bg-chrome hover:text-fg active:scale-[0.97] sm:min-h-9"
        >
          <TemplateIcon name={source.name} size={14} />
          {source.name}
        </Button>
      ))}
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
