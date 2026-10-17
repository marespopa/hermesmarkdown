import React from "react";
import { CLEANER_EXAMPLES } from "../cleaner/cleaner-examples";
import { TOKENIZER_EXAMPLES } from "../tokenizer/tokenizer-examples";
import { MODEL_PRICES } from "../token-cost/model-prices";

// Loading outlines for the tools, shown by each tool's loader while its code
// (and CodeMirror, the tokenizer or Mermaid) loads. Each mirrors its tool's
// layout and sizes, so the tool lands in place. Static black / white fills
// so the opacity modifier works; pulses only when motion is allowed.
const BAR = "bg-black/[0.06] dark:bg-white/[0.08] motion-safe:animate-pulse";
const PANEL = "rounded-xl border border-edge-subtle bg-surface-raised";
// The form fields' box (Input, Textarea, Select): same fill and edge.
const FIELD = "rounded-xl border border-beige bg-paper-softgray dark:border-clay dark:bg-paper-dark-surface/50";

// A bar in a line box set in the real text's type, so it takes that text's height.
function Line({ textClass, barClass }: { textClass: string; barClass: string }) {
  return (
    <span className={`relative block ${textClass}`}>
      {" "}
      <span className="absolute inset-0 flex items-center">
        <span className={`block rounded ${BAR} ${barClass}`} />
      </span>
    </span>
  );
}

// Input / Textarea: label, the field at its height, and an optional helper line.
function Field({ height, helper = false, className = "my-2" }: { height: string; helper?: boolean; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Line textClass="px-0.5 text-ui-footnote" barClass="h-2.5 w-24" />
      <div className={`${FIELD} ${height}`} />
      {helper && <Line textClass="px-0.5 text-ui-caption" barClass="h-2 w-3/5" />}
    </div>
  );
}

// A single-line Input: py-2.5 around a 20px line, plus its border.
const INPUT_HEIGHT = "h-[calc(2.5rem+2px)]";

// The example chips, by their real labels (static data).
function Chips({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <span key={label} className="flex h-8 items-center rounded-xl border border-beige px-3 text-ui-footnote font-semibold text-transparent dark:border-clay sm:text-ui-subhead">
          {label}
        </span>
      ))}
    </div>
  );
}

// A segmented control (format, tokenizer): a pill track holding `count` options.
function Segments({ count }: { count: number }) {
  return (
    <div className="flex gap-1 rounded-full bg-black/[0.05] p-1 dark:bg-white/[0.07]">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`h-8 w-16 rounded-full ${index === 0 ? "bg-surface shadow-sm" : ""}`} />
      ))}
    </div>
  );
}

// The row of actions under a tool (Open in editor, Copy, Clear: 44px buttons).
function Actions({ widths }: { widths: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {widths.map((width, index) => (
        <div key={index} className={`h-11 rounded-xl ${width} ${index === 0 ? BAR : "border border-beige dark:border-clay"}`} />
      ))}
    </div>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-label="Loading tool">
      <span className="sr-only">Loading…</span>
      <div aria-hidden="true" className="space-y-5">{children}</div>
    </div>
  );
}

export function CleanerSkeleton() {
  return (
    <Status>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chips labels={CLEANER_EXAMPLES.map((example) => example.label)} />
        <Segments count={4} />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field height="h-[420px]" helper />
        <div className="my-2 flex min-w-0 flex-col gap-1.5">
          <Line textClass="px-0.5 text-ui-footnote" barClass="h-2.5 w-28" />
          <div className={`${PANEL} h-[420px]`} />
        </div>
      </div>
      <Actions widths={["w-40", "w-36", "w-20"]} />
    </Status>
  );
}

export function MermaidSkeleton() {
  return (
    <Status>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <div className="flex flex-col gap-1.5">
            <Line textClass="text-ui-footnote" barClass="h-2.5 w-36" />
            <div className={`${FIELD} h-11`} />
          </div>
          <Field height="h-[420px]" />
        </div>
        <div className="min-w-0 md:pt-[84px]">
          <div className="h-[420px] rounded-md bg-paper-light/50 dark:bg-paper-dark/40" />
        </div>
      </div>
      <Actions widths={["w-40", "w-36"]} />
    </Status>
  );
}

export function TokenizerSkeleton() {
  return (
    <Status>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chips labels={TOKENIZER_EXAMPLES.map((example) => example.label)} />
        <Segments count={2} />
      </div>
      <Field height="h-[180px]" helper />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className={`${PANEL} px-4 py-3`}>
            <Line textClass="text-ui-footnote" barClass="h-2.5 w-16" />
            <Line textClass="text-ui-title-2" barClass="h-5 w-12" />
          </div>
        ))}
      </div>
      <div className={`${PANEL} space-y-3 p-4`}>
        <div className="flex items-center justify-between gap-3">
          <Line textClass="text-ui-subhead" barClass="h-3 w-14" />
          <div className="h-8 w-32 rounded-xl border border-beige dark:border-clay" />
        </div>
        {["w-full", "w-11/12", "w-2/3"].map((width, index) => (
          <Line key={index} textClass="text-ui-callout leading-relaxed" barClass={`h-3 ${width}`} />
        ))}
      </div>
    </Status>
  );
}

export function TokenCostSkeleton() {
  return (
    <Status>
      <Field height="h-[180px]" />
      <div className="grid items-end gap-3 sm:grid-cols-2">
        <div className={`${PANEL} px-4 py-3`}>
          <Line textClass="text-ui-footnote" barClass="h-2.5 w-20" />
          <Line textClass="text-ui-title-2" barClass="h-5 w-16" />
        </div>
        <Field height={INPUT_HEIGHT} helper className="my-0" />
      </div>
      <div className="space-y-2">
        <div className="overflow-hidden rounded-xl border border-edge-subtle">
          <div className="border-b border-edge-subtle px-3 py-2">
            <Line textClass="text-ui-footnote" barClass="h-2.5 w-1/3" />
          </div>
          {MODEL_PRICES.map((model) => (
            <div key={model.id} className="flex items-center gap-4 border-b border-edge-subtle px-3 py-2 last:border-0">
              <div className="flex-1">
                <Line textClass="text-ui-subhead" barClass="h-3 w-32" />
              </div>
              <div className={`h-3 w-14 rounded ${BAR}`} />
            </div>
          ))}
        </div>
        <Line textClass="text-ui-caption" barClass="h-2 w-4/5" />
        <Line textClass="text-ui-caption" barClass="h-2 w-2/3" />
      </div>
      <Actions widths={["w-40", "w-20"]} />
    </Status>
  );
}

export function TableSkeleton() {
  return (
    <Status>
      <div className="flex flex-wrap items-end gap-3">
        <Field height={INPUT_HEIGHT} className="my-0 w-28" />
        <Field height={INPUT_HEIGHT} className="my-0 w-28" />
        <div className="h-11 w-32 rounded-xl border border-beige bg-paper-light dark:border-clay dark:bg-paper-dark-surface" />
        <div className="h-11 w-32 rounded-xl border border-beige dark:border-clay" />
      </div>
      {/* The grid: the default 3 × 2 table on the editor's paper sheet. */}
      <div className="editor-sheet overflow-hidden rounded-xl px-4 py-5 sm:px-6">
        {[0, 1, 2].map((row) => (
          <div key={row} className="grid grid-cols-3 gap-3 border-b border-edge-subtle py-2.5 last:border-0">
            {[0, 1, 2].map((col) => (
              <div key={col} className={`h-3.5 rounded ${row === 0 ? "w-2/3" : "w-1/2"} ${BAR}`} />
            ))}
          </div>
        ))}
      </div>
      <div>
        <Line textClass="text-ui-footnote" barClass="h-2.5 w-full" />
        <Line textClass="text-ui-footnote" barClass="h-2.5 w-11/12" />
        <Line textClass="text-ui-footnote" barClass="h-2.5 w-1/2" />
      </div>
      <div className={`${PANEL} space-y-3 p-4`}>
        <div className="flex items-center justify-between gap-3">
          <Line textClass="text-ui-subhead" barClass="h-3 w-20" />
          <div className="h-8 w-32 rounded-full border border-beige dark:border-clay" />
        </div>
        {["w-1/2", "w-1/2", "w-1/2", "w-1/2"].map((width, index) => (
          <Line key={index} textClass="font-mono text-ui-footnote" barClass={`h-2.5 ${width}`} />
        ))}
      </div>
      <Actions widths={["w-40"]} />
    </Status>
  );
}
