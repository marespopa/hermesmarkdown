"use client";

import React, { useEffect, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { HiOutlineDatabase, HiOutlineTemplate, HiOutlineViewBoards } from "react-icons/hi";
import Button from "@/app/components/Button";
import TemplateIcon from "@/app/components/TemplateDialog/TemplateIcon";
import { atom_templates } from "@/app/atoms/template-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_browserVaultDialogOpen } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
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
// A small button on the gray fill: 36px, 44px tall on a phone.
const PILL_CLASS = "pointer-events-auto min-h-11 sm:min-h-9 bg-fill hover:bg-fill-hover";

// Soft pills resting under the first line of an empty note. With no vault
// open, an "Open Vault" pill leads (a folder on disk, or a browser vault
// where there's no disk access). Then one click fills
// the note from one of the vault's templates. With none yet (or no vault at
// all), a few built-in starters fill it instead, plus a "Browse template
// packs" pill to the Templates page when there's a vault to add them to; a
// Board pill (vault only: it creates a file) starts a drawing board instead
// of text. They fade out as soon as the note has text.
export default function EmptyNoteTemplates({ isEmpty, onPick, onMore, onBoard }: EmptyNoteTemplatesProps) {
  const templates = useAtomValue(atom_templates);
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const router = useRouter();
  const { openVault, isVaultSupported, isBrowserVaultSupported } = useFileSystem();
  const setBrowserVaultDialogOpen = useSetAtom(atom_browserVaultDialogOpen);
  const canOpenVault = !hasVault && (isVaultSupported || isBrowserVaultSupported);
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
      {canOpenVault && (
        <Button
          variant="small"
          onClick={() => (isVaultSupported ? void openVault() : setBrowserVaultDialogOpen(true))}
          className={PILL_CLASS}
        >
          <HiOutlineDatabase size={14} aria-hidden />
          Open Vault
        </Button>
      )}
      {shown.slice(0, MAX_PILLS).map((template) => (
        <Button key={template.path} variant="small" onClick={() => onPick(template)} className={PILL_CLASS}>
          <TemplateIcon name={template.name} size={14} />
          {template.name}
        </Button>
      ))}
      {templates.length === 0 && hasVault && (
        <Button variant="small" onClick={() => router.push("/editor/templates")} className={PILL_CLASS}>
          <HiOutlineTemplate size={14} aria-hidden />
          Browse template packs
        </Button>
      )}
      {onBoard && hasVault && (
        <Button variant="small" onClick={onBoard} className={PILL_CLASS}>
          <HiOutlineViewBoards size={14} aria-hidden />
          Board
        </Button>
      )}
      {hasMore && (
        <Button
          variant="unstyled"
          onClick={onMore}
          className="pointer-events-auto inline-flex min-h-11 items-center rounded-lg px-3 font-sans text-ui-footnote text-fg-faint hover:text-fg sm:min-h-9"
        >
          More…
        </Button>
      )}
    </div>
  );
}
