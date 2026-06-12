"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_vaultMigrateOpen, atom_isAiConfigured } from "@/app/atoms/ui-atoms";
import { atom_vaultSchema } from "@/app/atoms/schema-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import Toggle from "@/app/components/Toggle";
import { callAI } from "@/app/services/ai";
import { DEFAULT_SCHEMA } from "@/app/services/vault-schema";
import { parseFmFields, updateFmFields, FM_REGEX } from "@/app/utils/frontmatter-utils";
import type { VaultSchema, SchemaField } from "@/app/services/vault-schema";
import { HiOutlineRefresh, HiOutlineCheckCircle, HiOutlineExclamationCircle } from "react-icons/hi";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "scanning" | "preview" | "migrating" | "done";

interface FilePlan {
  path: string;
  handle: any;
  missingFields: SchemaField[];
  needsAI: boolean;
}

interface FileResult {
  path: string;
  status: "updated" | "skipped" | "error";
  error?: string;
}

// Fields we skip auto-fill for (too vault-specific for AI to guess reliably)
const SKIP_FIELDS = new Set(["related", "edit_elsewhere"]);

// Fields that benefit from AI (content-based)
const AI_FILLABLE = new Set(["scope", "read_when", "tags"]);

function isAIFillable(field: SchemaField): boolean {
  return AI_FILLABLE.has(field.key) || Boolean(field.description);
}

function fieldHasValue(parsed: Record<string, string>, key: string): boolean {
  const v = parsed[key];
  if (!v) return false;
  const trimmed = v.trim();
  return trimmed !== "" && trimmed !== "[]";
}

// ---------------------------------------------------------------------------
// Per-file migration
// ---------------------------------------------------------------------------

async function migrateFile(
  plan: FilePlan,
  schema: VaultSchema,
  useAI: boolean,
  signal: AbortSignal,
): Promise<FileResult> {
  try {
    const file = await plan.handle.getFile();
    const content: string = await file.text();
    const parsed = parseFmFields(content);
    const edits: Record<string, string> = {};

    const defaultFields: SchemaField[] = [];
    const aiFields: SchemaField[] = [];

    for (const field of plan.missingFields) {
      if (SKIP_FIELDS.has(field.key)) continue;

      if (field.key === "title") {
        edits["title"] = plan.handle.name?.replace(/\.md$/i, "").replace(/[-_]/g, " ") ?? "";
      } else if (field.default !== undefined && field.default !== "") {
        edits[field.key] = field.default;
      } else if (useAI && isAIFillable(field)) {
        aiFields.push(field);
      } else if (field.type === "enum" && field.values?.length) {
        edits[field.key] = field.values[0];
      } else {
        defaultFields.push(field);
      }
    }

    if (useAI && aiFields.length > 0) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");

      const body = content.replace(FM_REGEX, "").trim().slice(0, 2000);
      const titleVal = edits["title"] || parsed["title"] || plan.handle.name?.replace(/\.md$/i, "") || "";
      const fieldList = aiFields
        .map((f) => `- ${f.key} (${f.type}${f.description ? `: ${f.description}` : ""})`)
        .join("\n");

      const raw = await callAI(
        "You fill frontmatter fields for Markdown notes. Return ONLY a JSON object — no explanation, no markdown.",
        `Fields to fill:\n${fieldList}\n\nTitle: ${titleVal}\n\nContent (excerpt):\n${body}\n\nRules:\n- For list fields return an array of strings\n- scope must be one sentence under 20 words\n- read_when entries describe when an AI should load this file\n- tags are lowercase single words`,
      );

      try {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}") + 1;
        const obj = JSON.parse(raw.slice(start, end));
        for (const field of aiFields) {
          if (obj[field.key] !== undefined) {
            const v = obj[field.key];
            edits[field.key] = Array.isArray(v) ? v.join(", ") : String(v);
          }
        }
      } catch {
        // AI response unparseable — leave AI fields empty
      }
    }

    if (Object.keys(edits).length === 0) return { path: plan.path, status: "skipped" };

    const updated = updateFmFields(content, edits, schema);
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    const writable = await plan.handle.createWritable();
    await writable.write(updated);
    await writable.close();

    return { path: plan.path, status: "updated" };
  } catch (err: any) {
    if (err.name === "AbortError") throw err;
    return { path: plan.path, status: "error", error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VaultMigrateWizard() {
  const [isOpen, setIsOpen] = useAtom(atom_vaultMigrateOpen);
  const rawSchema = useAtomValue(atom_vaultSchema);
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);

  const schema = rawSchema ?? DEFAULT_SCHEMA;

  const [phase, setPhase] = useState<Phase>("scanning");
  const [plans, setPlans] = useState<FilePlan[]>([]);
  const [useAI, setUseAI] = useState(true);
  const [results, setResults] = useState<FileResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  // Scan on open
  useEffect(() => {
    if (!isOpen) return;

    setPhase("scanning");
    setResults([]);
    setProgress(0);
    setCurrentFile("");

    const entries = Object.values(fileMetadata);
    const newPlans: FilePlan[] = [];

    for (const meta of entries) {
      if (!meta.handle) continue;
      const parsed: Record<string, string> = meta.frontmatter
        ? Object.fromEntries(
            Object.entries(meta.frontmatter).map(([k, v]) => [
              k,
              Array.isArray(v) ? v.join(", ") : String(v ?? ""),
            ]),
          )
        : {};

      const missing = schema.fields.filter(
        (f) => !SKIP_FIELDS.has(f.key) && !fieldHasValue(parsed, f.key),
      );

      if (missing.length > 0) {
        newPlans.push({
          path: meta.path,
          handle: meta.handle,
          missingFields: missing,
          needsAI: missing.some((f) => isAIFillable(f)),
        });
      }
    }

    setPlans(newPlans);
    setPhase("preview");
  }, [isOpen, fileMetadata, schema]);

  const handleApply = useCallback(async () => {
    if (plans.length === 0) { setIsOpen(false); return; }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase("migrating");
    setProgress(0);

    const batch: FileResult[] = [];
    for (let i = 0; i < plans.length; i++) {
      if (ctrl.signal.aborted) break;
      const plan = plans[i];
      setCurrentFile(plan.path);
      const result = await migrateFile(plan, schema, useAI && isAiConfigured, ctrl.signal).catch(
        () => ({ path: plan.path, status: "error" as const, error: "Aborted" }),
      );
      batch.push(result);
      setProgress(i + 1);
    }

    setResults(batch);
    setPhase("done");
    abortRef.current = null;
  }, [plans, schema, useAI, isAiConfigured, setIsOpen]);

  const handleClose = () => {
    abortRef.current?.abort();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  // -------------------------------------------------------------------------
  // Derived stats
  // -------------------------------------------------------------------------

  const totalFiles = Object.keys(fileMetadata).length;
  const affectedCount = plans.length;
  const aiNeededCount = plans.filter((p) => p.needsAI).length;

  const updated = results.filter((r) => r.status === "updated").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error");

  // Collect unique missing field names for the preview summary
  const missingFieldKeys = Array.from(
    new Set(plans.flatMap((p) => p.missingFields.map((f) => f.key))),
  );

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const progressPct = plans.length > 0 ? Math.round((progress / plans.length) * 100) : 100;

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={handleClose}
      onConfirm={phase === "preview" ? handleApply : handleClose}
      styles="sm:!max-w-md"
      mobileSheet
      ariaLabelledBy="migrate-heading"
    >
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-1 pr-8">
          <h2
            id="migrate-heading"
            className="text-ui-body font-semibold text-ink-light dark:text-ink-dark"
          >
            {phase === "done" ? "Migration Complete" : "Apply Schema to Vault"}
          </h2>
          <p className="text-ui-footnote text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {phase === "scanning" && "Scanning vault files…"}
            {phase === "preview" &&
              `Adds missing frontmatter fields to ${affectedCount} of ${totalFiles} files based on the current schema.`}
            {phase === "migrating" && "Writing files — do not close this window."}
            {phase === "done" && `Processed ${plans.length} file${plans.length !== 1 ? "s" : ""}.`}
          </p>
        </div>

        {/* SCANNING */}
        {phase === "scanning" && (
          <div className="flex items-center gap-3 py-4">
            <HiOutlineRefresh size={18} className="animate-spin text-stone shrink-0" />
            <span className="text-ui-footnote text-stone">Reading vault…</span>
          </div>
        )}

        {/* PREVIEW */}
        {phase === "preview" && (
          <>
            {affectedCount === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                <HiOutlineCheckCircle size={18} className="text-emerald-500 shrink-0" />
                <p className="text-ui-footnote text-emerald-700 dark:text-emerald-400 font-medium">
                  All {totalFiles} files already conform to the schema.
                </p>
              </div>
            ) : (
              <>
                {/* Fields that will be added */}
                {missingFieldKeys.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-stone px-0.5">
                      Fields to add
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {missingFieldKeys.map((k) => {
                        const field = schema.fields.find((f) => f.key === k);
                        const needsAI = field ? isAIFillable(field) : false;
                        return (
                          <span
                            key={k}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                              needsAI
                                ? "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
                                : "bg-paper-softgray text-ink-muted border-beige dark:bg-paper-dark dark:text-stone dark:border-clay"
                            }`}
                          >
                            {k}
                            {needsAI && " ✦"}
                          </span>
                        );
                      })}
                    </div>
                    {aiNeededCount > 0 && (
                      <p className="text-ui-caption text-stone px-0.5">
                        <span className="text-purple-500">✦</span> Filled by AI · {aiNeededCount} file{aiNeededCount !== 1 ? "s" : ""} need AI calls
                      </p>
                    )}
                  </div>
                )}

                {/* AI toggle */}
                {isAiConfigured && aiNeededCount > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-beige dark:border-clay bg-paper-softgray/50 dark:bg-paper-dark/30">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-ui-footnote font-medium text-ink-light dark:text-ink-dark">
                        Use AI to fill content fields
                      </span>
                      <span className="text-ui-caption text-stone">
                        Generates scope, tags, and read_when from each note's body.
                        Slower — roughly {aiNeededCount * 2}–{aiNeededCount * 4}s total.
                      </span>
                    </div>
                    <Toggle variant="soft" active={useAI} onChange={setUseAI} />
                  </div>
                )}

                {!isAiConfigured && aiNeededCount > 0 && (
                  <p className="text-ui-caption text-stone bg-paper-softgray dark:bg-paper-dark/30 px-3 py-2 rounded-lg border border-beige dark:border-clay">
                    Add an API key in Settings → AI to fill content-based fields (scope, tags, read_when) automatically.
                    Without AI, those fields will be left empty.
                  </p>
                )}
              </>
            )}
          </>
        )}

        {/* MIGRATING */}
        {phase === "migrating" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-ui-caption text-stone">
              <span className="truncate max-w-[70%]">{currentFile}</span>
              <span className="tabular-nums shrink-0">{progress} / {plans.length}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-paper-softgray dark:bg-paper-dark-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-sage transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === "done" && (
          <div className="flex flex-col gap-3">
            {/* Overall status banner */}
            {errors.length === 0 ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                <HiOutlineCheckCircle size={18} className="text-emerald-500 shrink-0" />
                <p className="text-ui-footnote font-medium text-emerald-700 dark:text-emerald-400">
                  {updated > 0
                    ? `${updated} file${updated !== 1 ? "s" : ""} updated successfully.`
                    : "All files already up to date — nothing to change."}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <HiOutlineExclamationCircle size={18} className="text-red-400 shrink-0" />
                <p className="text-ui-footnote font-medium text-red-700 dark:text-red-400">
                  {errors.length} file{errors.length !== 1 ? "s" : ""} failed
                  {updated > 0 ? ` — ${updated} updated successfully` : ""}.
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                <span className="text-ui-title-3 font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{updated}</span>
                <span className="text-ui-caption text-emerald-700/70 dark:text-emerald-500">updated</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-paper-softgray dark:bg-paper-dark/30 border border-beige dark:border-clay">
                <span className="text-ui-title-3 font-bold text-ink-muted dark:text-stone tabular-nums">{skipped}</span>
                <span className="text-ui-caption text-stone">skipped</span>
              </div>
              <div className={`flex flex-col items-center gap-1 p-3 rounded-xl border ${errors.length > 0 ? "bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800" : "bg-paper-softgray border-beige dark:bg-paper-dark/30 dark:border-clay"}`}>
                <span className={`text-ui-title-3 font-bold tabular-nums ${errors.length > 0 ? "text-red-500 dark:text-red-400" : "text-ink-muted dark:text-stone"}`}>{errors.length}</span>
                <span className={`text-ui-caption ${errors.length > 0 ? "text-red-600/70 dark:text-red-500" : "text-stone"}`}>errors</span>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                {errors.map((e) => (
                  <div key={e.path} className="flex items-start gap-2 text-ui-caption">
                    <HiOutlineExclamationCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                    <span className="text-stone truncate">{e.path}</span>
                    {e.error && <span className="text-red-500 dark:text-red-400 shrink-0">{e.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {phase === "preview" && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="outlined" onClick={handleClose}>
              Cancel
            </Button>
            {affectedCount === 0 ? (
              <Button variant="primary" onClick={handleClose}>
                Close
              </Button>
            ) : (
              <Button variant="primary" onClick={handleApply}>
                Apply to {affectedCount} file{affectedCount !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="flex justify-end pt-1">
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </div>
    </DialogModal>
  );
}
