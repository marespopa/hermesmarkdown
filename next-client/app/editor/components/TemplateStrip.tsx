"use client";

import React, { useMemo } from "react";
import Button from "@/app/components/Button";
import { lintTemplate } from "@/app/utils/templates/template-lint";
import { extractPromptLabels } from "@/app/utils/templates/template-tokens";

interface TemplateStripProps {
  /** The template's raw text. */
  doc: string;
  /** Opens the field menu at the caret. */
  onAddField: () => void;
}

// One quiet line at the top of a template note: how many fields it asks
// for, an Add field button, and the same lint warnings AI Chat's save card
// shows.
export default function TemplateStrip({ doc, onAddField }: TemplateStripProps) {
  const fields = useMemo(() => extractPromptLabels(doc).length, [doc]);
  const warnings = useMemo(() => lintTemplate(doc), [doc]);

  return (
    <div className="mb-3 border-b border-edge-subtle pb-1 font-sans text-ui-caption text-fg-muted" aria-label="Template">
      <div className="flex items-center gap-2">
        <span className="truncate">
          Template · {fields === 0 ? "no fields to fill in" : `asks for ${fields} field${fields === 1 ? "" : "s"}`}
        </span>
        <Button
          variant="bare"
          onClick={onAddField}
          className="ml-auto min-h-11 shrink-0 px-2 text-sage"
          aria-label="Add template field"
        >
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
