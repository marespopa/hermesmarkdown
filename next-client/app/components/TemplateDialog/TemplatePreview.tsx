"use client";

import React, { useMemo } from "react";
import { templatePreview, type PreviewSegment } from "@/app/utils/templates/template-preview";

interface TemplatePreviewProps {
  /** Raw template text, or null while it loads. */
  raw: string | null;
  /** Used as the note title in the preview. */
  name: string;
}

const LINE_CLASSES = {
  h1: "text-[1.35em] font-bold text-fg mt-0.5 mb-1",
  h2: "text-[1.1em] font-semibold text-fg mt-2",
  h3: "font-semibold text-fg mt-1.5",
  task: "flex gap-1.5 text-fg-muted",
  bullet: "flex gap-1.5 text-fg-muted",
  text: "text-fg-muted",
  blank: "h-2",
} as const;

function Segments({ segments }: { segments: PreviewSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.question ? (
          <span
            key={index}
            className="mx-0.5 rounded border border-dashed border-[color:color-mix(in_srgb,var(--clay)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--clay)_10%,transparent)] px-1 text-[color:var(--clay)]"
          >
            {segment.text}
          </span>
        ) : (
          <React.Fragment key={index}>{segment.text}</React.Fragment>
        ),
      )}
    </>
  );
}

// Read-only, scaled-down look at the note a template makes today: dates and
// title filled in, questions as pills, properties as quiet rows.
export default function TemplatePreview({ raw, name }: TemplatePreviewProps) {
  const model = useMemo(() => (raw === null ? null : templatePreview(raw, name, new Date())), [raw, name]);

  return (
    <div
      aria-label={`Preview of ${name}`}
      className="h-full min-h-0 overflow-hidden rounded-2xl border border-edge-subtle bg-surface px-4 py-3 text-[0.8rem] leading-relaxed"
    >
      <p className="mb-2 font-sans text-[0.65rem] font-semibold uppercase tracking-wider text-fg-faint">Preview</p>
      {model === null ? (
        <p className="font-sans text-ui-caption text-fg-faint">Loading…</p>
      ) : (
        <div key={name} className="template-preview-in">
          {model.properties.length > 0 && (
            <div className="mb-2 space-y-0.5 rounded-lg bg-[var(--frontmatter-bg)] px-2 py-1 font-sans text-[0.7rem]">
              {model.properties.map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-fg-faint">{key}</span>
                  <span className="truncate text-fg-muted">{value}</span>
                </div>
              ))}
            </div>
          )}
          {model.lines.map((line, index) => (
            <div key={index} className={LINE_CLASSES[line.kind]}>
              {line.kind === "task" && <span aria-hidden className="text-fg-faint">☐</span>}
              {line.kind === "bullet" && <span aria-hidden className="text-fg-faint">•</span>}
              <span className="min-w-0"><Segments segments={line.segments} /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
