"use client";

import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_fileContent } from "@/app/atoms/file-atoms";
import { atom_frontmatterWizardOpen, atom_isAiConfigured } from "@/app/atoms/ui-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { callAI, generateFrontmatterData } from "@/app/services/ai";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import { HiOutlineLightningBolt, HiOutlineRefresh, HiOutlineLink } from "react-icons/hi";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import { AIThinkingOverlay } from "./AIThinkingOverlay";

// ---------------------------------------------------------------------------
// Frontmatter helpers
// ---------------------------------------------------------------------------

const FM_REGEX = /^---\n([\s\S]*?)\n---\n?/;

function parseFmFields(content: string): Record<string, string> {
  const m = FM_REGEX.exec(content);
  if (!m) return {};
  const fields: Record<string, string> = {};
  const lines = m[1].split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const lm = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (!lm) { i++; continue; }

    const key = lm[1];
    const rawVal = lm[2].trim();
    i++;

    // Collect indented continuation lines
    const continuation: string[] = [];
    while (i < lines.length && /^\s/.test(lines[i])) {
      continuation.push(lines[i]);
      i++;
    }

    // Block scalar indicator: bare `|`/`>` or quoted `"|"`/`">"`
    const isBlockScalar = /^["|>|]?[|>]["']?$/.test(rawVal) || rawVal === "|" || rawVal === ">";
    // Flow array or empty array
    const isFlowArray = rawVal.startsWith("[") && rawVal.endsWith("]");
    const isEmptyArray = rawVal === "[]";

    if (isBlockScalar && continuation.length > 0) {
      fields[key] = continuation.map((l) => l.trim()).filter(Boolean).join("\n");
    } else if ((isEmptyArray || rawVal === "") && continuation.some((l) => /^\s*-\s/.test(l))) {
      // Block sequence items
      fields[key] = continuation
        .filter((l) => /^\s*-\s/.test(l))
        .map((l) => l.replace(/^\s*-\s+/, "").trim())
        .join(", ");
    } else if (isFlowArray) {
      fields[key] = rawVal.slice(1, -1).trim();
    } else {
      fields[key] = rawVal.replace(/^"|"$/g, "").trim();
    }
  }

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
  if (val.includes("\n")) {
    const indented = val.split("\n").map((l) => `  ${l}`).join("\n");
    return `${key}: |\n${indented}`;
  }
  return `${key}: "${val}"`;
}

function updateFmFields(
  content: string,
  edits: Record<string, string>,
): string {
  const m = FM_REGEX.exec(content);
  
  // If no frontmatter block exists, prepend a new one
  if (!m) {
    const newLines = Object.entries(edits)
      .filter(([, val]) => val.trim() !== "")
      .map(([key, val]) => serializeField(key, val));
    if (newLines.length === 0) return content;
    return `---\n${newLines.join("\n")}\n---\n\n${content.trim()}`;
  }

  const seen = new Set<string>();
  const lines = m[1].split("\n");
  const updatedLines: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const lm = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);

    if (lm && lm[1] in edits) {
      const key = lm[1];
      seen.add(key);
      updatedLines.push(serializeField(key, edits[key]));
      i++;
      // Drop stale indented continuation lines
      while (i < lines.length && /^\s/.test(lines[i])) i++;
    } else {
      updatedLines.push(line);
      i++;
    }
  }

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
  { label: "Connect", fields: ["related"] },
];

const STATUS_OPTIONS = ["draft", "review", "active", "archived"] as const;

const STEP_DESCRIPTIONS = [
  "Give this file a clear title and set its current status. These help agents and collaborators understand the file at a glance.",
  "Describe what this file covers in one paragraph. Agents use this to decide whether to load the file.",
  "Add comma-separated tags to make this file discoverable. Tags should be lowercase and descriptive.",
  'Describe when an AI agent should load this file. For example: "When answering questions about payments or billing."',
  "Add related notes to help agents find relevant information. Use [[WikiLinks]] or click suggest.",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FrontmatterWizard() {
  const [wizardPath, setWizardPath] = useAtom(atom_frontmatterWizardOpen);
  const isOpen = wizardPath !== null;
  const [content, setContent] = useAtom(atom_fileContent(wizardPath ?? "draft"));
  const metadata = useAtomValue(atom_fileMetadata);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const [step, setStep] = useState(0);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setSuggestions([]);
      const fields = parseFmFields(content);
      setEdits({
        title: fields.title || "",
        status: (fields.status || "draft").replace(/^#/, ""),
        scope: fields.scope || "",
        tags: (fields.tags || "").replace(/^\[|\]$/g, ""),
        read_when: (fields.read_when || "").replace(/^\[|\]$/g, ""),
        related: (fields.related || "").replace(/^\[|\]$/g, ""),
      });
    }
    // We only want to run this when isOpen transitions to true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (key: string, val: string) =>
    setEdits((e) => ({ ...e, [key]: val }));

  const getNoteBody = () => content.replace(FM_REGEX, "").trim();

  const handleGenerateAll = async () => {
    const body = getNoteBody();
    if (!body) {
      showErrorToast("Note is empty. Nothing to generate from.");
      return;
    }

    setIsGenerating(true);
    try {
      const data = await generateFrontmatterData(body);
      const newEdits = {
        ...edits,
        title: data.title || edits.title,
        scope: data.scope,
        tags: data.tags.join(", "),
        read_when: data.read_when.join(", "),
      };
      
      const updated = updateFmFields(content, newEdits);
      setContent(updated);
      showSuccessToast("Frontmatter generated and applied!");
      setWizardPath(null);
    } catch (error: any) {
      showErrorToast(error.message || "Failed to generate frontmatter.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSummarizeScope = async () => {
    const body = getNoteBody();
    if (!body) return;

    setIsGenerating(true);
    try {
      const summary = await callAI(
        "You are a precise summarizer. Return a single sentence, max 20 words. No quotes, no period at the end.",
        `Summarize this note in one sentence:\n\n${body}`
      );
      set("scope", summary.replace(/^"|"$/g, "").trim());
      showSuccessToast("Scope summarized!");
    } catch (error: any) {
      showErrorToast(error.message || "Failed to summarize scope.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestRelated = async () => {
    const currentTags = (edits.tags || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    const allMetas = Object.values(metadata).filter(m => m.path !== wizardPath);
    
    const tagMatched = allMetas.filter(m => m.tags.some(t => currentTags.includes(t.toLowerCase())));
    let indexMetas = [...tagMatched];

    if (indexMetas.length < 30) {
      const remaining = allMetas
        .filter(m => !indexMetas.includes(m))
        .sort((a, b) => b.modifiedAt - a.modifiedAt);
      indexMetas = [...indexMetas, ...remaining.slice(0, 30 - indexMetas.length)];
    }

    const finalIndex = indexMetas.slice(0, 50);
    const indexStr = finalIndex.map(m => `- "${m.name.replace(/\.md$/, '')}" [${m.tags.join(', ')}] — ${m.frontmatter?.scope || ''}`).join('\n');

    setIsGenerating(true);
    try {
      const result = await callAI(
        "You are a knowledge graph assistant. Return ONLY a JSON array of note titles. No explanation.",
        `Current note:
Title: ${edits.title}
Tags: ${edits.tags}
Scope: ${edits.scope}

Vault index:
${indexStr}

Return the 3-5 most semantically related note titles as a JSON array.`
      );
      
      const titles = JSON.parse(result) as string[];
      setSuggestions(titles);
      showSuccessToast("Suggestions ready!");
    } catch (error: any) {
      showErrorToast(error.message || "Failed to get suggestions.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddRelated = (title: string) => {
    const link = `[[${title}]]`;
    const current = edits.related || "";
    if (current.includes(link)) return;
    set("related", current ? `${current}, ${link}` : link);
    setSuggestions(prev => prev.filter(t => t !== title));
  };

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
                  <Button
                    key={opt}
                    variant="bare"
                    type="button"
                    onClick={() => set("status", opt)}
                    className={`px-3 py-1.5 rounded-full text-ui-footnote font-medium border transition-all duration-150 ${
                      edits.status === opt
                        ? "bg-violet-600 text-white border-violet-600 dark:bg-violet-500 dark:border-violet-500"
                        : "bg-transparent border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-0.5">
              <label
                htmlFor="fm-scope"
                className="text-ui-footnote font-medium text-zinc-500 dark:text-zinc-400"
              >
                Scope
              </label>
              {isAiConfigured && (
                <button
                  type="button"
                  onClick={handleSummarizeScope}
                  disabled={isGenerating}
                  className="text-ui-caption font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  {isGenerating ? (
                    <HiOutlineRefresh className="animate-spin" size={12} />
                  ) : (
                    <HiOutlineLightningBolt size={12} />
                  )}
                  Summarize
                </button>
              )}
            </div>
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
      case 4:
        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-0.5">
              <label
                htmlFor="fm-related"
                className="text-ui-footnote font-medium text-zinc-500 dark:text-zinc-400"
              >
                Related
              </label>
              {isAiConfigured && (
                <button
                  type="button"
                  onClick={handleSuggestRelated}
                  disabled={isGenerating}
                  className="text-ui-caption font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  {isGenerating ? (
                    <HiOutlineRefresh className="animate-spin" size={12} />
                  ) : (
                    <HiOutlineLink size={12} />
                  )}
                  Suggest
                </button>
              )}
            </div>
            <Input
              name="fm-related"
              value={edits.related}
              handleChange={(e) => set("related", e.target.value)}
              placeholder="e.g. [[Project X]], [[Meetings]]"
              className="my-0"
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {suggestions.map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => handleAddRelated(title)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-ui-caption font-medium border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                  >
                    + {title}
                  </button>
                ))}
              </div>
            )}
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
    <>
    {isGenerating && <AIThinkingOverlay />}
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
        <div className="flex flex-col gap-1 pr-10">
          <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            {isAiConfigured && (
              <Button
                variant="bare"
                onClick={handleGenerateAll}
                disabled={isGenerating}
                title="Auto-fill with AI"
                className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-3 py-2 rounded-lg flex items-center gap-1.5"
              >
                {isGenerating ? (
                  <HiOutlineRefresh className="animate-spin" size={16} />
                ) : (
                  <HiOutlineLightningBolt size={16} />
                )}
                <span className="text-ui-caption font-semibold">AI Magic</span>
              </Button>
            )}
            <Button variant="primary" onClick={handleNext}>
              {isLastStep ? "Save & Close" : "Next"}
            </Button>
          </div>
        </div>

      </div>
    </DialogModal>
    </>
  );
}
