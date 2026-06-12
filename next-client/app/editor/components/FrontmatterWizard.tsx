"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { atom_vaultSchema } from "@/app/atoms/schema-atoms";
import { DEFAULT_SCHEMA, type SchemaField, type VaultSchema } from "@/app/services/vault-schema";

import { FM_REGEX, parseFmFields, updateFmFields } from "@/app/utils/frontmatter-utils";

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
      description: "Give this file a clear title and set its current status. These help agents and collaborators understand the file at a glance.",
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
    scope: "Describe what this file covers. Agents use this to decide whether to load the file.",
    tags: "Add comma-separated tags to make this file discoverable. Tags should be lowercase.",
    read_when: 'Describe when an AI agent should load this file. For example: "When answering questions about payments."',
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
      setStep(0);
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
  // Shared styles
  // -------------------------------------------------------------------------

  const textareaClass =
    "w-full px-4 py-2.5 text-ui-subhead font-sans transition-all duration-150 ease-in-out border rounded-xl outline-none resize-none " +
    "bg-paper-softgray border-beige text-ink-light placeholder:text-stone " +
    "dark:bg-paper-dark-surface/50 dark:border-clay dark:text-ink-dark dark:placeholder:text-stone " +
    "focus:ring-4 focus:ring-sage/10 focus:border-sage dark:focus:ring-sage/20";

  // -------------------------------------------------------------------------
  // Field renderers
  // -------------------------------------------------------------------------

  const renderEnumField = (field: SchemaField, first: boolean) => {
    const values = field.values ?? [];
    return (
      <div className="flex flex-col gap-1.5" key={field.key}>
        <span className="text-ui-footnote font-medium text-ink-muted dark:text-stone px-0.5">
          {capitalize(field.key)}
        </span>
        <div className="flex flex-wrap gap-2">
          {values.map((opt) => (
            <Button
              key={opt}
              variant="bare"
              type="button"
              onClick={() => set(field.key, opt)}
              className={`px-3 py-1.5 rounded-full text-ui-footnote font-medium border transition-all duration-150 ${
                edits[field.key] === opt
                  ? "bg-sage text-white border-sage dark:bg-sage dark:border-sage"
                  : "bg-transparent border-beige text-ink-muted hover:bg-paper-softgray dark:border-clay dark:text-stone dark:hover:bg-paper-dark-surface"
              }`}
            >
              {opt}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderScopeField = (field: SchemaField) => {
    const isActiveFile = edits.status === "active";
    const isScopeEmpty = !edits.scope?.trim();
    const scopeWordCount = edits.scope?.trim() ? edits.scope.trim().split(/\s+/).filter(Boolean).length : 0;
    const scopeError = isActiveFile && isScopeEmpty;
    const cls = textareaClass + (scopeError ? " !border-red-400 dark:!border-red-500" : "");

    return (
      <div className="flex flex-col gap-1.5" key={field.key}>
        <div className="flex items-center justify-between px-0.5">
          <label htmlFor="fm-scope" className="text-ui-footnote font-medium text-ink-muted dark:text-stone">
            Scope
          </label>
          {isAiConfigured && (
            <button
              type="button"
              onClick={handleSummarizeScope}
              disabled={isGenerating}
              className="text-ui-caption font-medium text-sage dark:text-sage hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              {isGenerating ? <HiOutlineRefresh className="animate-spin" size={12} /> : <HiOutlineLightningBolt size={12} />}
              Summarize
            </button>
          )}
        </div>
        <textarea
          id="fm-scope"
          value={edits.scope ?? ""}
          onChange={(e) => set("scope", e.target.value)}
          placeholder="What does this file cover? One paragraph."
          rows={3}
          autoFocus
          className={cls}
        />
        <div className="flex items-center justify-between px-0.5">
          {scopeError ? (
            <span className="text-ui-caption text-red-500 dark:text-red-400">Required for active files</span>
          ) : (
            <span />
          )}
          <span className={`text-ui-caption tabular-nums ${scopeWordCount > 30 ? "text-amber-500" : "text-fg-faint"}`}>
            {scopeWordCount} / 30 words
          </span>
        </div>
      </div>
    );
  };

  const renderReadWhenField = (field: SchemaField) => {
    const rwValue = edits.read_when?.trim() ?? "";
    const isAlways = rwValue === "always";
    const isNever = rwValue === "never";
    const isReserved = isAlways || isNever;
    const readWhenWarning = edits.status === "active" && !rwValue;
    const cls = textareaClass + (readWhenWarning ? " !border-amber-400 dark:!border-amber-500" : "");

    return (
      <div className="flex flex-col gap-2" key={field.key}>
        <label htmlFor="fm-read-when" className="text-ui-footnote font-medium text-ink-muted dark:text-stone px-0.5">
          Read when
        </label>
        {!isReserved && (
          <textarea
            id="fm-read-when"
            value={edits.read_when ?? ""}
            onChange={(e) => set("read_when", e.target.value)}
            placeholder={`"user is working on debt repayment"\n"task involves financial projections"\n"keywords: budget, creditor, repayment"`}
            rows={3}
            autoFocus
            className={cls}
          />
        )}
        {readWhenWarning && !isReserved && (
          <span className="text-ui-caption text-amber-500 dark:text-amber-400 px-0.5">Recommended for active files</span>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-ui-caption text-fg-faint px-0.5">Quick set:</span>
          <button
            type="button"
            onClick={() => set("read_when", isAlways ? "" : "always")}
            className={`px-3 py-1 rounded-full text-ui-caption font-medium border transition-all duration-150 ${
              isAlways
                ? "bg-sage text-white border-sage"
                : "bg-transparent border-beige text-ink-muted hover:bg-paper-softgray dark:border-clay dark:text-stone dark:hover:bg-paper-dark-surface"
            }`}
          >
            always
          </button>
          <button
            type="button"
            onClick={() => set("read_when", isNever ? "" : "never")}
            className={`px-3 py-1 rounded-full text-ui-caption font-medium border transition-all duration-150 ${
              isNever
                ? "bg-red-400 text-white border-red-400 dark:bg-red-500 dark:border-red-500"
                : "bg-transparent border-beige text-ink-muted hover:bg-paper-softgray dark:border-clay dark:text-stone dark:hover:bg-paper-dark-surface"
            }`}
          >
            never
          </button>
          {isReserved && (
            <span className="text-ui-caption text-fg-faint">
              {isAlways ? "File is always included in agent context" : "File is excluded from all agent context"}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderRelatedField = (field: SchemaField) => (
    <div className="flex flex-col gap-3" key={field.key}>
      <div className="flex items-center justify-between px-0.5">
        <label htmlFor="fm-related" className="text-ui-footnote font-medium text-ink-muted dark:text-stone">
          Related
        </label>
        {isAiConfigured && (
          <button
            type="button"
            onClick={handleSuggestRelated}
            disabled={isGenerating}
            className="text-ui-caption font-medium text-sage dark:text-sage hover:underline disabled:opacity-50 flex items-center gap-1"
          >
            {isGenerating ? <HiOutlineRefresh className="animate-spin" size={12} /> : <HiOutlineLink size={12} />}
            Suggest
          </button>
        )}
      </div>
      <Input
        name="fm-related"
        value={edits.related ?? ""}
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
              className="px-2.5 py-1 rounded-lg bg-sage/10 dark:bg-sage/10 text-sage dark:text-sage text-ui-caption font-medium border border-sage/20 dark:border-sage/20 hover:bg-sage/20 dark:hover:bg-sage/20 transition-colors"
            >
              + {title}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderTitleField = (field: SchemaField) => (
    <Input
      key={field.key}
      name="fm-title"
      label="Title"
      value={edits.title ?? ""}
      handleChange={(e) => set("title", e.target.value)}
      placeholder="e.g. Payment Integration Guide"
      autoFocus
      className="my-0"
    />
  );

  const renderGenericListField = (field: SchemaField) => (
    <Input
      key={field.key}
      name={`fm-${field.key}`}
      label={capitalize(field.key.replace(/_/g, " "))}
      value={edits[field.key] ?? ""}
      handleChange={(e) => set(field.key, e.target.value)}
      placeholder={`Comma-separated values`}
      autoFocus
      className="my-0"
    />
  );

  const renderGenericStringField = (field: SchemaField, autoFocus = true) => (
    <div className="flex flex-col gap-1.5" key={field.key}>
      <label className="text-ui-footnote font-medium text-ink-muted dark:text-stone px-0.5">
        {capitalize(field.key.replace(/_/g, " "))}
      </label>
      <textarea
        value={edits[field.key] ?? ""}
        onChange={(e) => set(field.key, e.target.value)}
        placeholder={field.description ?? `Enter ${field.key}`}
        rows={3}
        autoFocus={autoFocus}
        className={textareaClass}
      />
    </div>
  );

  const renderField = (field: SchemaField, autoFocus = true): React.ReactNode => {
    if (field.key === "title") return renderTitleField(field);
    if (field.key === "scope") return renderScopeField(field);
    if (field.key === "read_when") return renderReadWhenField(field);
    if (field.key === "related") return renderRelatedField(field);
    if (field.type === "enum") return renderEnumField(field, autoFocus);
    if (field.type === "list") return renderGenericListField(field);
    return renderGenericStringField(field, autoFocus);
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
              Step {step + 1} of {wizardSteps.length}
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

          {/* Step content */}
          <div className="flex flex-col gap-4">
            {currentStep.fields.map((field, i) => (
              <React.Fragment key={field.key}>
                {renderField(field, i === 0)}
              </React.Fragment>
            ))}
          </div>

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
