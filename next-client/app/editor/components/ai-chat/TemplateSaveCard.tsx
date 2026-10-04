"use client";

import React, { useMemo, useState } from "react";
import { HiOutlineDocumentText } from "react-icons/hi";
import Button from "@/app/components/Button";
import { lintTemplate } from "@/app/utils/templates/template-lint";
import type { TemplateBlock } from "./chat-skills";

interface TemplateSaveCardProps {
  block: TemplateBlock;
  /** Where the template would be written (`<templates folder>/<name>.md`). */
  path: string;
  /** A template with this name already exists (the button replaces it). */
  exists: boolean;
  /** False without an open vault. */
  canSave: boolean;
  onSave: (block: TemplateBlock) => Promise<boolean>;
}

// Card under an AI Chat reply for one `~~~~hermes-template` block: target
// path, lint warnings, and the explicit Save / Replace button. Nothing is
// written until the button is clicked.
export default function TemplateSaveCard({ block, path, exists, canSave, onSave }: TemplateSaveCardProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  // An in-place edit of the reply changes the block: offer saving it again.
  const [savedContent, setSavedContent] = useState(block.content);
  if (savedContent !== block.content) {
    setSavedContent(block.content);
    setStatus("idle");
  }
  const warnings = useMemo(() => lintTemplate(block.content), [block.content]);

  const save = async () => {
    setStatus("saving");
    setStatus((await onSave(block)) ? "saved" : "idle");
  };

  const label = !canSave
    ? "Open a vault to save"
    : status === "saved"
      ? "Saved"
      : exists
        ? "Replace template"
        : "Save template";

  return (
    <div className="w-full rounded-xl border border-edge-subtle bg-surface-raised px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2 min-w-0">
        <HiOutlineDocumentText size={14} className="shrink-0 text-fg-muted" />
        <span className="truncate font-mono text-ui-caption text-fg" title={path}>{path}</span>
      </div>
      {warnings.length > 0 && (
        <ul className="space-y-0.5 text-ui-caption text-fg-muted">
          {warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}
      <Button
        variant="secondary"
        onClick={save}
        isDisabled={!canSave || status !== "idle"}
        className="h-9 w-full"
      >
        {label}
      </Button>
    </div>
  );
}
