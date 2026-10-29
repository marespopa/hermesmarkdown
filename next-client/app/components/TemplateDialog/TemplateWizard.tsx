"use client";

import React, { useState } from "react";
import { HiCheck } from "react-icons/hi";
import type { TemplateWizardPreset, TemplateWizardResult } from "@/app/atoms/template-atoms";
import Button, { SEGMENT_TRACK_CLASS } from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal";
import Input, { Select } from "@/app/components/Input";
import Toggle from "@/app/components/Toggle";

type Kind = TemplateWizardResult["kind"];
type From = TemplateWizardResult["from"];

export interface TemplateWizardExample {
  /** Goes back as `example:<id>`. */
  id: string;
  name: string;
  description?: string;
}

interface TemplateWizardProps {
  isOpen: boolean;
  /** Opens on this kind and example (its name filled in). */
  preset?: TemplateWizardPreset;
  /** Built-in note templates to start from. */
  noteExamples: TemplateWizardExample[];
  /** Built-in folder templates to start from. */
  folderExamples: TemplateWizardExample[];
  /** Offer "A folder in your vault" (it has folders to copy). */
  canCopyFolder: boolean;
  /** Your packs (folders of note templates in `_templates/`), to put a note template in. */
  packs?: string[];
  onSubmit: (result: TemplateWizardResult) => void;
  onCancel: () => void;
}

// The Pack select's "New pack…".
const NEW_PACK = "\u0000new";

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: "note", label: "File", hint: "Starts one file. Use it with /template or New file from a link." },
  { value: "folder", label: "Folder", hint: "Makes a whole folder of files at once. Use it with New from folder template." },
];

// "New template": what kind (a note or a folder template), its name, and what
// it starts from: blank, a built-in example, or (folders) a folder already in
// the vault. Picking an example fills an untouched name; `preset` opens on
// one, or on a pack. A note template can go in a pack: none, one of yours,
// or a new one named here (Folder templates sit directly in the templates
// folder, so they have none). A folder template can
// ask for its new folder's name each time it's used (on by default). Enter
// creates once a name is in; Esc or Cancel cancels.
export default function TemplateWizard({
  isOpen,
  preset,
  packs = [],
  noteExamples,
  folderExamples,
  canCopyFolder,
  onSubmit,
  onCancel,
}: TemplateWizardProps) {
  const presetName = preset
    ? (preset.kind === "note" ? noteExamples : folderExamples).find((e) => `example:${e.id}` === preset.from)?.name
    : undefined;
  const [kind, setKind] = useState<Kind>(preset?.kind ?? "note");
  const [name, setName] = useState(presetName ?? "");
  // The name as the last example filled it in; a typed name is never replaced.
  const [filledName, setFilledName] = useState(presetName ?? "");
  const [from, setFrom] = useState<From>(presetName && preset?.from ? preset.from : "blank");
  // "" no pack, NEW_PACK a new one (named in newPack), else one of yours.
  const [pack, setPack] = useState(preset?.pack ?? "");
  const [newPack, setNewPack] = useState("");
  const [askName, setAskName] = useState(true);

  const examples = kind === "note" ? noteExamples : folderExamples;
  const options: { value: From; label: string; description: string }[] = [
    { value: "blank", label: "Blank", description: kind === "note" ? "A title and a blank page" : "A folder with a README" },
    ...examples.map((example) => ({
      value: `example:${example.id}` as const,
      label: example.name,
      description: example.description ? `Example · ${example.description}` : "Example",
    })),
    ...(kind === "folder" && canCopyFolder
      ? [{ value: "vault" as const, label: "A folder in your vault…", description: "Its files and subfolders, as they are" }]
      : []),
  ];

  const changeKind = (next: Kind) => {
    setKind(next);
    setFrom("blank");
    if (name === filledName) {
      setName("");
      setFilledName("");
    }
  };

  const pick = (value: From) => {
    setFrom(value);
    const example = examples.find((e) => `example:${e.id}` === value);
    if (name.trim() === "" || name === filledName) {
      const next = example?.name ?? "";
      setName(next);
      setFilledName(next);
    }
  };

  const trimmed = name.trim();
  const packName = pack === NEW_PACK ? newPack.trim() : pack;
  const canSubmit = !!trimmed && !(kind === "note" && pack === NEW_PACK && !packName);
  const submit = () => {
    if (!canSubmit) return;
    onSubmit(kind === "note"
      ? { kind, name: trimmed, from: from === "vault" ? "blank" : from, ...(packName ? { pack: packName } : {}) }
      : { kind, name: trimmed, from, askName });
  };
  const packOptions = [
    { value: "", label: "No pack" },
    // A preset pack not listed yet (an empty one just made) still shows.
    ...[...new Set([...packs, ...(preset?.pack ? [preset.pack] : [])])].map((p) => ({ value: p, label: p })),
    { value: NEW_PACK, label: "New pack…" },
  ];

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={onCancel}
      onConfirm={submit}
      hideCloseButton
      mobileSheet
      ariaLabelledBy="template-wizard-title"
    >
      <div className="space-y-4">
        <h3 id="template-wizard-title" className="text-ui-title-3 font-bold font-mono tracking-tight">
          New template
        </h3>

        <div className="space-y-1.5">
          <div role="group" aria-label="Kind" className={`inline-flex gap-0.5 ${SEGMENT_TRACK_CLASS}`}>
            {KINDS.map((option) => (
              <Button
                key={option.value}
                variant="segment"
                aria-pressed={kind === option.value}
                onClick={() => changeKind(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <p className="text-ui-footnote text-fg-muted">{KINDS.find((k) => k.value === kind)!.hint}</p>
        </div>

        <Input
          name="template-wizard-name"
          label="Name"
          value={name}
          handleChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div role="radiogroup" aria-label="Start from" className="space-y-0.5">
          <p className="pb-1 text-ui-footnote font-medium text-fg-muted">Start from</p>
          {options.map((option) => (
            <Button
              key={option.value}
              variant="menu-row"
              role="radio"
              aria-checked={from === option.value}
              onClick={() => pick(option.value)}
              className={`!h-auto py-1.5 ${from === option.value ? "bg-fill" : ""}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-fg">{option.label}</span>
                <span className="block text-ui-caption text-fg-faint">{option.description}</span>
              </span>
              {from === option.value && <HiCheck size={14} aria-hidden className="shrink-0 text-fg" />}
            </Button>
          ))}
        </div>

        {kind === "note" && (
          <div className="space-y-2">
            <Select
              name="template-wizard-pack"
              label="Pack"
              value={pack}
              options={packOptions}
              handleChange={(e) => setPack(e.target.value)}
              compact
              fullWidth
            />
            {pack === NEW_PACK && (
              <Input
                name="template-wizard-new-pack"
                label="New pack name"
                value={newPack}
                handleChange={(e) => setNewPack(e.target.value)}
              />
            )}
          </div>
        )}

        {kind === "folder" && (
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-ui-footnote text-fg">Ask for the folder&apos;s name each time</span>
              <span className="block text-ui-caption text-fg-faint">
                {askName ? `The new folder is named by your answer to "${trimmed || "Name"}".` : `Every new folder is named "${trimmed || "Name"}".`}
              </span>
            </span>
            <Toggle active={askName} onChange={setAskName} label="Ask for the folder's name each time" />
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <Button variant="primary" onClick={submit} isDisabled={!canSubmit} className="w-full">
            Create template
          </Button>
          <Button variant="secondary" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
