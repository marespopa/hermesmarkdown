"use client";

import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { atom_fileContent } from "@/app/atoms/file-atoms";
import { atom_frontmatterWizardOpen } from "@/app/atoms/ui-atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";

// ---------------------------------------------------------------------------
// Frontmatter helpers
// ---------------------------------------------------------------------------

const FM_REGEX = /^---\n([\s\S]*?)\n---\n?/;

function parseFmFields(content: string): Record<string, string> {
  const m = FM_REGEX.exec(content);
  if (!m) return {};
  const fields: Record<string, string> = {};
  m[1].split("\n").forEach((line) => {
    const lm = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (lm) fields[lm[1]] = lm[2].replace(/^"|"$/g, "").trim();
  });
  return fields;
}

const ARRAY_KEYS = new Set(["tags", "read_when", "related", "edit_elsewhere"]);
const BARE_KEYS = new Set(["status"]);

function serializeField(key: string, val: string): string {
  if (ARRAY_KEYS.has(key)) {
    const items = val.split(",").map((s) => s.trim()).filter(Boolean);
    return `${key}: [${items.join(", ")}]`;
  }
  if (BARE_KEYS.has(key)) {
    return `${key}: ${val}`;
  }
  return `${key}: "${val}"`;
}

function updateFmFields(
  content: string,
  edits: Record<string, string>,
): string {
  const m = FM_REGEX.exec(content);
  if (!m) return content;

  const seen = new Set<string>();
  const updatedLines = m[1].split("\n").map((line) => {
    const lm = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (!lm || !(lm[1] in edits)) return line;
    const key = lm[1];
    seen.add(key);
    const val = edits[key];
    return serializeField(key, val);
  });

  // Append any edited fields that weren't already in the block
  for (const [key, val] of Object.entries(edits)) {
    if (!seen.has(key) && val.trim() !== "") {
      updatedLines.push(serializeField(key, val));
    }
  }

  return `---\n${updatedLines.join("\n")}\n---\n` + content.slice(m[0].length);
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Identify", fields: ["title", "status"] },
  { label: "Describe", fields: ["scope"] },
  { label: "Tag", fields: ["tags"] },
  { label: "Context", fields: ["read_when"] },
];

const STATUS_OPTIONS = ["draft", "review", "active", "archived"] as const;

const STEP_DESCRIPTIONS = [
  "Give this file a clear title and set its current status. These help agents and collaborators understand the file at a glance.",
  "Describe what this file covers in one paragraph. Agents use this to decide whether to load the file.",
  "Add comma-separated tags to make this file discoverable. Tags should be lowercase and descriptive.",
  'Describe when an AI agent should load this file. For example: "When answering questions about payments or billing."',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FrontmatterWizard() {
  const [wizardPath, setWizardPath] = useAtom(atom_frontmatterWizardOpen);
  const isOpen = wizardPath !== null;
  const [content, setContent] = useAtom(atom_fileContent(wizardPath ?? "draft"));
  const [step, setStep] = useState(0);
  const [edits, setEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      const fields = parseFmFields(content);
      setEdits({
        title: fields.title || "",
        status: (fields.status || "draft").replace(/^#/, ""),
        scope: fields.scope || "",
        tags: (fields.tags || "").replace(/^\[|\]$/g, ""),
        read_when: (fields.read_when || "").replace(/^\[|\]$/g, ""),
      });
    }
    // We only want to run this when isOpen transitions to true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (key: string, val: string) =>
    setEdits((e) => ({ ...e, [key]: val }));

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      const updated = updateFmFields(content, edits);
      setContent(updated);
      setWizardPath(null);
    }
  };

  const handleSkip = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else setWizardPath(null);
  };

  const isLastStep = step === STEPS.length - 1;

  // -------------------------------------------------------------------------
  // Step content
  // -------------------------------------------------------------------------

  const textareaClass =
    "w-full px-4 py-2.5 text-ui-subhead font-sans transition-all duration-150 ease-in-out border rounded-xl outline-none resize-none " +
    "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 " +
    "dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500 " +
    "focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:ring-blue-500/20";

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col gap-4">
            <Input
              name="fm-title"
              label="Title"
              value={edits.title}
              handleChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Payment Integration Guide"
              autoFocus
              className="my-0"
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-ui-footnote font-medium text-zinc-500 dark:text-zinc-400 px-0.5">
                Status
              </span>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set("status", opt)}
                    className={`px-3 py-1.5 rounded-full text-ui-footnote font-medium border transition-all duration-150 ${
                      edits.status === opt
                        ? "bg-violet-600 text-white border-violet-600 dark:bg-violet-500 dark:border-violet-500"
                        : "bg-transparent border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fm-scope"
              className="text-ui-footnote font-medium text-zinc-500 dark:text-zinc-400 px-0.5"
            >
              Scope
            </label>
            <textarea
              id="fm-scope"
              value={edits.scope}
              onChange={(e) => set("scope", e.target.value)}
              placeholder="What does this file cover? One paragraph."
              rows={3}
              autoFocus
              className={textareaClass}
            />
          </div>
        );
      case 2:
        return (
          <Input
            name="fm-tags"
            label="Tags"
            value={edits.tags}
            handleChange={(e) => set("tags", e.target.value)}
            placeholder="e.g. payments, stripe, billing"
            autoFocus
            className="my-0"
          />
        );
      case 3:
        return (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fm-read-when"
              className="text-ui-footnote font-medium text-zinc-500 dark:text-zinc-400 px-0.5"
            >
              Read when
            </label>
            <textarea
              id="fm-read-when"
              value={edits.read_when}
              onChange={(e) => set("read_when", e.target.value)}
              placeholder="When should an AI agent load this file?"
              rows={3}
              autoFocus
              className={textareaClass}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={() => setWizardPath(null)}
      onConfirm={handleNext}
      styles="sm:!max-w-md"
      mobileSheet
      ariaLabelledBy="fm-wizard-heading"
    >
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-1 pr-6">
          <div className="flex items-center gap-2">
            <span className="text-ui-caption font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <h2
            id="fm-wizard-heading"
            className="text-ui-body font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {STEPS[step].label}
          </h2>
          <p className="text-ui-footnote text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {STEP_DESCRIPTIONS[step]}
          </p>
        </div>

        {/* Step content */}
        <div>{renderStepContent()}</div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === step
                  ? "w-4 h-1.5 bg-violet-500"
                  : i < step
                  ? "w-1.5 h-1.5 bg-violet-300 dark:bg-violet-700"
                  : "w-1.5 h-1.5 bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="outlined" onClick={handleSkip}>
            Skip
          </Button>
          <Button variant="primary" onClick={handleNext}>
            {isLastStep ? "Save & Close" : "Next"}
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
