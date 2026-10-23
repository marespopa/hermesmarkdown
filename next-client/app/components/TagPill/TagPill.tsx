import React from "react";
import { WORKFLOW_TAGS } from "@/app/editor/components/constants";

export type TagKind = "workflow" | "custom";

// The one tag look: sized in em so it fits editor text, footnote rows and caption chips.
export const TAG_PILL_CLASS =
  "inline-flex items-center whitespace-nowrap rounded-full border border-edge " +
  "bg-[color:color-mix(in_srgb,var(--chrome)_72%,transparent)] px-[0.45em] py-[0.1em] " +
  "text-[0.9em] font-normal leading-[1.2]";

const KIND_CLASS: Record<TagKind, string> = { workflow: "text-sage", custom: "text-fg-muted" };

export function tagKind(tag: string): TagKind {
  return WORKFLOW_TAGS.includes(tag.replace(/^#/, "").toLowerCase()) ? "workflow" : "custom";
}

export function tagPillClass(kind: TagKind): string {
  return `${TAG_PILL_CLASS} ${KIND_CLASS[kind]}`;
}

type Props = Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> & {
  /** Tag name without "#". */
  tag: string;
  /** Replaces the default `#tag` text (e.g. palette match highlights). */
  label?: React.ReactNode;
  /** Rendered inside the pill after the label (e.g. a remove control). */
  trailing?: React.ReactNode;
};

export default function TagPill({ tag, label, trailing, className = "", ...rest }: Props) {
  return (
    <span {...rest} className={`${tagPillClass(tagKind(tag))} ${className}`.trim()}>
      {label ?? `#${tag}`}
      {trailing}
    </span>
  );
}
