"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_fileContent } from "@/app/atoms/file-atoms";
import { atom_frontmatterWizardOpen, atom_frontmatterWizardTargetField, atom_isAiConfigured } from "@/app/atoms/ui-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { callAI, generateFrontmatterData } from "@/app/services/ai";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import { HiOutlineLightningBolt, HiOutlineRefresh, HiOutlineLink } from "react-icons/hi";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import { AIThinkingOverlay } from "./AIThinkingOverlay";
import { atom_vaultSchema } from "@/app/atoms/schema-atoms";
import { DEFAULT_SCHEMA, type SchemaField, type VaultSchema } from "@/app/services/vault-schema";

import { FM_REGEX, parseFmFields, updateFmFields } from "@/app/utils/frontmatter-utils";
import {
  TitleField,
  EnumField,
  ScopeField,
  ReadWhenField,
  TagsChipInput,
  RelatedField,
  DateField,
  GenericField,
} from "./frontmatter";

// ---------------------------------------------------------------------------
// Wizard step building from schema
// ---------------------------------------------------------------------------

interface WizardStep {
  label: string;
  description: string;
  fields: SchemaField[];
}

function buildWizardSteps(schema: VaultSchema): WizardStep[] {
  const remaining = [...schema.fields];
  const steps: WizardStep[] = [];

  // Step 0: "Identify" — title + status (or first required string + first enum)
  const identifyFields: SchemaField[] = [];
  const titleIdx = remaining.findIndex((f) => f.key === "title");
  if (titleIdx >= 0) identifyFields.push(...remaining.splice(titleIdx, 1));
  const statusIdx = remaining.findIndex((f) => f.key === "status" || f.type === "enum");
  if (statusIdx >= 0) identifyFields.push(...remaining.splice(statusIdx, 1));

  if (identifyFields.length > 0) {
    steps.push({
      label: "Identify",
      description: "Give this file a title and status. These are the only required fields — everything else is optional and can be added later.",
      fields: identifyFields,
    });
  }

  // Remaining fields: each gets its own step
  for (const field of remaining) {
    steps.push({
      label: stepLabel(field),
      description: stepDescription(field),
      fields: [field],
    });
  }

  return steps;
}

function stepLabel(field: SchemaField): string {
  const known: Record<string, string> = {
    scope: "Describe",
    tags: "Tag",
    read_when: "Context",
    related: "Connect",
    edit_elsewhere: "External",
  };
  return known[field.key] ?? capitalize(field.key.replace(/_/g, " "));
}

function stepDescription(field: SchemaField): string {
  const known: Record<string, string> = {
    scope: "Tier 2 of the read protocol — agents read this before opening the file. One sentence on what it covers. If scope isn't enough, agents load the full file.",
    tags: "Add comma-separated tags to make this file discoverable. Tags should be lowercase.",
    read_when: "Tier 1 of the read protocol — the first thing agents check. Describe the tasks or contexts where this file is relevant. Agents scan this without loading the file.",
    related: "Add related notes to help agents find relevant information. Use [[WikiLinks]] or click Suggest.",
    edit_elsewhere: "List files or resources that are edited outside this vault.",
  };
  return known[field.key] ?? field.description ?? `Enter a value for ${field.key}.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FrontmatterWizard() {
  const [wizardPath, setWizardPath] = useAtom(atom_frontmatterWizardOpen);
  const [targetField, setTargetField] = useAtom(atom_frontmatterWizardTargetField);
  const isOpen = wizardPath !== null;
  const [content, setContent] = useAtom(atom_fileContent(wizardPath ?? "draft"));
  const metadata = useAtomValue(atom_fileMetadata);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const rawSchema = useAtomValue(atom_vaultSchema);
  const schema = rawSchema ?? DEFAULT_SCHEMA;

  const [step, setStep] = useState(0);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const wizardSteps = useMemo(() => buildWizardSteps(schema), [schema]);

  useEffect(() => {
    if (isOpen) {
      const targetStep = targetField
        ? wizardSteps.findIndex((s) => s.fields.some((f) => f.key === targetField))
        : -1;
      setStep(targetStep >= 0 ? targetStep : 0);
      setTargetField(null);
      setSuggestions([]);
      const parsed = parseFmFields(content);
      const initial: Record<string, string> = {};
      for (const field of schema.fields) {
        let raw = parsed[field.key] ?? field.default ?? "";
        if (field.type === "list") {
          raw = raw.replace(/^\[|\]$/g, "").trim();
        }
        if (field.key === "status") {
          raw = raw.replace(/^#/, "") || field.values?.[0] || "draft";
        }
        initial[field.key] = raw;
      }
      setEdits(initial);
    }
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
      const updated = updateFmFields(content, newEdits, schema);
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
        `Summarize this note in one sentence:\n\n${body}`,
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
    const currentTags = (edits.tags || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    const allMetas = Object.values(metadata).filter((m) => m.path !== wizardPath);

    const tagMatched = allMetas.filter((m) => m.tags.some((t) => currentTags.includes(t.toLowerCase())));
    let indexMetas = [...tagMatched];

    if (indexMetas.length < 30) {
      const remaining = allMetas
        .filter((m) => !indexMetas.includes(m))
        .sort((a, b) => b.modifiedAt - a.modifiedAt);
      indexMetas = [...indexMetas, ...remaining.slice(0, 30 - indexMetas.length)];
    }

    const finalIndex = indexMetas.slice(0, 50);
    const indexStr = finalIndex
      .map((m) => `- "${m.name.replace(/\.md$/, "")}" [${m.tags.join(", ")}] — ${m.frontmatter?.scope || ""}`)
      .join("\n");

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

Return the 3-5 most semantically related note titles as a JSON array.`,
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
    setSuggestions((prev) => prev.filter((t) => t !== title));
  };

  const handleNext = () => {
    if (step < wizardSteps.length - 1) {
      setStep((s) => s + 1);
    } else {
      const updated = updateFmFields(content, edits, schema);
      setContent(updated);
      setWizardPath(null);
    }
  };

  const handleSkip = () => {
    if (step < wizardSteps.length - 1) setStep((s) => s + 1);
    else setWizardPath(null);
  };

  const isLastStep = step === wizardSteps.length - 1;
  const currentStep = wizardSteps[step];

  // -------------------------------------------------------------------------
  // Field renderers — thin wrappers around the shared frontmatter/ components,
  // wired up with this wizard's AI actions (Summarize, Suggest, etc).
  // -------------------------------------------------------------------------

  const renderField = (field: SchemaField, autoFocus = true): React.ReactNode => {
    if (field.key === "title") {
      return <TitleField key={field.key} value={edits.title ?? ""} onChange={(v) => set("title", v)} autoFocus={autoFocus} />;
    }
    if (field.key === "scope") {
      const isActiveFile = edits.status === "active";
      const scopeError = isActiveFile && !edits.scope?.trim();
      return (
        <ScopeField
          key={field.key}
          value={edits.scope ?? ""}
          onChange={(v) => set("scope", v)}
          error={scopeError}
          errorMessage="Required for active files"
          autoFocus={autoFocus}
          headerActions={
            isAiConfigured && (
              <button
                type="button"
                onClick={handleSummarizeScope}
                disabled={isGenerating}
                className="text-ui-caption font-medium text-sage dark:text-sage hover:underline disabled:opacity-50 flex items-center gap-1"
              >
                {isGenerating ? <HiOutlineRefresh className="animate-spin" size={12} /> : <HiOutlineLightningBolt size={12} />}
                Summarize
              </button>
            )
          }
        />
      );
    }
    if (field.key === "read_when") {
      return (
        <ReadWhenField
          key={field.key}
          value={edits.read_when ?? ""}
          onChange={(v) => set("read_when", v)}
          warning={edits.status === "active" && !edits.read_when?.trim()}
          autoFocus={autoFocus}
        />
      );
    }
    if (field.key === "related") {
      return (
        <RelatedField
          key={field.key}
          value={edits.related ?? ""}
          onChange={(v) => set("related", v)}
          suggestions={suggestions}
          onAddSuggestion={handleAddRelated}
          headerActions={
            isAiConfigured && (
              <button
                type="button"
                onClick={handleSuggestRelated}
                disabled={isGenerating}
                className="text-ui-caption font-medium text-sage dark:text-sage hover:underline disabled:opacity-50 flex items-center gap-1"
              >
                {isGenerating ? <HiOutlineRefresh className="animate-spin" size={12} /> : <HiOutlineLink size={12} />}
                Suggest
              </button>
            )
          }
        />
      );
    }
    if (field.key === "tags") {
      return <TagsChipInput key={field.key} value={edits.tags ?? ""} onChange={(v) => set("tags", v)} autoFocus={autoFocus} />;
    }
    if (field.type === "enum") {
      return (
        <EnumField
          key={field.key}
          fieldKey={field.key}
          values={field.values ?? []}
          value={edits[field.key] ?? ""}
          onChange={(v) => set(field.key, v)}
        />
      );
    }
    if (field.type === "date") {
      return <DateField key={field.key} value={edits[field.key] ?? ""} onChange={(v) => set(field.key, v)} autoFocus={autoFocus} />;
    }
    return (
      <GenericField
        key={field.key}
        fieldKey={field.key}
        value={edits[field.key] ?? ""}
        onChange={(v) => set(field.key, v)}
        type={field.type === "list" ? "list" : "string"}
        description={field.description}
        autoFocus={autoFocus}
      />
    );
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
            <span className="text-ui-caption font-medium text-stone uppercase tracking-wider">
              Agent metadata · {step + 1} of {wizardSteps.length}
            </span>
            <h2
              id="fm-wizard-heading"
              className="text-ui-body font-semibold text-ink-light dark:text-ink-dark"
            >
              {currentStep.label}
            </h2>
            <p className="text-ui-footnote text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Step content — disabled while AI is generating so concurrent edits
              can't be clobbered when the response lands. */}
          <fieldset disabled={isGenerating} className="flex flex-col gap-4 border-0 m-0 p-0 disabled:opacity-50">
            {currentStep.fields.map((field, i) => (
              <React.Fragment key={field.key}>
                {renderField(field, i === 0)}
              </React.Fragment>
            ))}
          </fieldset>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {wizardSteps.map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === step
                    ? "w-4 h-1.5 bg-sage"
                    : i < step
                    ? "w-1.5 h-1.5 bg-sage/60 dark:bg-sage/40"
                    : "w-1.5 h-1.5 bg-beige dark:bg-clay"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="outlined" onClick={handleSkip} disabled={isGenerating}>
              Skip
            </Button>
            <div className="flex items-center gap-2">
              {isAiConfigured && (
                <Button
                  variant="bare"
                  onClick={handleGenerateAll}
                  disabled={isGenerating}
                  title="Auto-fill with AI"
                  className="text-sage dark:text-sage hover:bg-sage/10 dark:hover:bg-sage/10 px-3 py-2 rounded-lg flex items-center gap-1.5"
                >
                  {isGenerating ? (
                    <HiOutlineRefresh className="animate-spin" size={16} />
                  ) : (
                    <HiOutlineLightningBolt size={16} />
                  )}
                  <span className="text-ui-caption font-semibold">AI Magic</span>
                </Button>
              )}
              <Button variant="primary" onClick={handleNext} disabled={isGenerating}>
                {isLastStep ? "Save & Close" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </DialogModal>
    </>
  );
}
