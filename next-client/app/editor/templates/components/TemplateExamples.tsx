"use client";

import React from "react";
import { HiOutlineFolder, HiOutlineSparkles } from "react-icons/hi";
import type { TemplateWizardPreset } from "@/app/atoms/template-atoms";
import TemplateIcon from "@/app/components/TemplateDialog/TemplateIcon";
import { BUILTIN_FOLDER_TEMPLATES } from "@/app/utils/templates/template-folders";
import { STARTER_TEMPLATES } from "@/app/utils/templates/template-packs";
import ActionButton from "./ActionButton";

interface TemplateExamplesProps {
  /** Opens the template wizard on this example. */
  onStart: (preset: TemplateWizardPreset) => void;
  /** Without a vault there is nowhere to make a template; also while the wizard is busy. */
  disabled?: boolean;
  /** `from` of the example the wizard was opened on, while it's busy: that button spins. */
  pending?: string;
}

interface Example {
  key: string;
  preset: TemplateWizardPreset;
  name: string;
  kind: string;
  description: string;
  icon: React.ReactNode;
}

const EXAMPLES: Example[] = [
  ...STARTER_TEMPLATES.map((t) => ({
    key: t.path,
    preset: { kind: "note" as const, from: `example:${t.path}` as const },
    name: t.name,
    kind: "File",
    description: t.description ?? "",
    icon: <TemplateIcon name={t.name} size={16} className="text-fg-muted" />,
  })),
  ...BUILTIN_FOLDER_TEMPLATES.map((pack) => ({
    key: pack.id,
    preset: { kind: "folder" as const, from: `example:${pack.id}` as const },
    name: pack.displayName ?? pack.name,
    kind: "Folder",
    description: pack.templates.map((t) => t.name.split("/").pop()).join(", "),
    icon: <HiOutlineFolder size={16} aria-hidden className="shrink-0 text-fg-muted" />,
  })),
];

// The built-in examples, two notes and two folders: a row each with what it
// makes and Start from this, which opens the template wizard on it (kind,
// example and name filled in), so the template you get is your own copy.
export default function TemplateExamples({ onStart, disabled = false, pending }: TemplateExamplesProps) {
  return (
    <ul className="divide-y divide-edge-subtle rounded-xl border border-edge-subtle bg-surface">
      {EXAMPLES.map((example) => (
        <li key={example.key} className="flex items-center gap-3 px-4 py-2.5">
          {example.icon}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-ui-subhead text-fg">{example.name}</span>
            <span className="block truncate text-ui-caption text-fg-faint">
              {example.kind} · {example.description}
            </span>
          </span>
          <ActionButton
            onClick={() => onStart(example.preset)}
            pending={pending === example.preset.from}
            isDisabled={disabled}
            className="bg-fill text-fg hover:bg-fill-hover"
            aria-label={`Start from ${example.name}`}
            icon={<HiOutlineSparkles size={14} aria-hidden />}
            label="Start from this"
          />
        </li>
      ))}
    </ul>
  );
}
