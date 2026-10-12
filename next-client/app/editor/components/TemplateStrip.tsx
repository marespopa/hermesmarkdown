"use client";

import React, { useMemo } from "react";
import Button from "@/app/components/Button";
import { lintTemplate } from "@/app/utils/templates/template-lint";

interface TemplateStripProps {
  /** Template name (file name without .md). */
  name: string;
  /** The template's raw text. */
  doc: string;
  /** Opens the field menu at the caret. */
  onAddField: () => void;
}

// One quiet line at the top of a template note ("Editing template: Name"),
// an Add field button, and plain-language warnings.
export default function TemplateStrip({ name, doc, onAddField }: TemplateStripProps) {
  const warnings = useMemo(() => lintTemplate(doc), [doc]);

  return (
    <div className="mb-3 border-b border-edge-subtle pb-1 font-sans text-ui-caption text-fg-muted" aria-label="Template">
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="min-w-0 truncate">
          Editing template: <span className="font-medium text-fg">{name}</span>
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
