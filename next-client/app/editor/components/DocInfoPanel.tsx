"use client";

import React, { useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_content,
  atom_selectionCount,
  atom_activeFilePath,
} from "@/app/atoms/atoms";
import {
  atom_isDocInfoOpen,
  atom_frontmatterWizardOpen,
  atom_frontmatterWizardTargetField,
  atom_isAiConfigured,
} from "@/app/atoms/ui-atoms";
import { generateContentFix } from "@/app/services/ai";
import { computeAgentScore, ScoreCheck } from "@/app/utils/agentScore";
import toast from "react-hot-toast";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineRefresh,
  HiOutlineMinusCircle,
  HiOutlineSparkles,
  HiOutlineX,
} from "react-icons/hi";

function agentDotClass(label: string): string {
  switch (label) {
    case "Structured":
      return "bg-emerald-500 dark:bg-emerald-400";
    case "Good":
      return "bg-sage";
    case "Fair":
      return "bg-amber-400";
    case "Weak":
      return "bg-red-500 dark:bg-red-400";
    default:
      return "bg-fg-faint";
  }
}

function ScoreCheckRow({ check, onFix }: { check: ScoreCheck; onFix: (fixField: string) => void }) {
  const icon = check.na ? (
    <HiOutlineMinusCircle className="w-3.5 h-3.5 shrink-0 opacity-40" />
  ) : check.passed ? (
    <HiOutlineCheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
  ) : (
    <HiOutlineExclamationCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
  );

  return (
    <div className="flex items-start gap-2">
      {icon}
      <span className="flex-1 opacity-80">{check.reason}</span>
      {!check.passed && !check.na && check.fixField && (
        <button
          type="button"
          onClick={() => onFix(check.fixField!)}
          className="shrink-0 text-sage dark:text-sage font-medium hover:underline"
        >
          Fix
        </button>
      )}
    </div>
  );
}

export default function DocInfoPanel() {
  const [isOpen, setIsOpen] = useAtom(atom_isDocInfoOpen);
  const [content, setContent] = useAtom(atom_content);
  const selectionCount = useAtomValue(atom_selectionCount);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const [, setFrontmatterWizardOpen] = useAtom(atom_frontmatterWizardOpen);
  const [, setFrontmatterWizardTargetField] = useAtom(atom_frontmatterWizardTargetField);
  const [isAutoFixing, setIsAutoFixing] = useState(false);

  const wordCount = useMemo(
    () => (content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0),
    [content],
  );
  const tokenCount = useMemo(() => Math.ceil(content.length / 4), [content]);
  const estimatedCost = useMemo(() => (tokenCount * 0.000003).toFixed(4), [tokenCount]);
  const agentRating = useMemo(() => computeAgentScore(content), [content]);

  if (!isOpen) return null;

  const handleFix = (fixField: string) => {
    if (!activeFilePath) return;
    setFrontmatterWizardTargetField(fixField);
    setFrontmatterWizardOpen(activeFilePath);
    setIsOpen(false);
  };

  const handleAutoFix = async () => {
    if (!content.trim()) {
      toast.error("Note is empty. Nothing to fix.");
      return;
    }
    const tips = computeAgentScore(content).tips;
    if (tips.length === 0) return;

    setIsAutoFixing(true);
    try {
      const fixed = await generateContentFix(content, tips);
      setContent(fixed);
      toast.success("Document auto-fixed with AI.");
    } catch (error: any) {
      toast.error(error.message || "Failed to auto-fix document.");
    } finally {
      setIsAutoFixing(false);
    }
  };

  const categories: { label: string; checks: ScoreCheck[] }[] = ["Frontmatter", "Headings", "Syntax"]
    .map((category) => ({
      label: category,
      checks: agentRating.checks.filter((c) => c.category === category),
    }))
    .filter((c) => c.checks.length > 0);

  const allPassed = agentRating.tips.length === 0 && agentRating.label !== "Empty";

  return (
    <DialogModal isOpened={isOpen} onClose={() => setIsOpen(false)} styles="max-w-[380px]" hideCloseButton>
      <div className="flex flex-col gap-4 text-sm leading-relaxed">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${agentDotClass(agentRating.label)}`} />
            <span className="font-bold tabular-nums text-[24px] leading-none">{agentRating.score}</span>
            <span className="opacity-50 font-medium leading-none">/100</span>
            <span className="font-semibold lowercase">{agentRating.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-fg-muted hover:text-fg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Close"
            >
              <HiOutlineX size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-ui-footnote text-fg-muted border-t border-edge-subtle pt-3 -mt-1">
          <span>
            <span className="font-semibold text-fg">
              {selectionCount > 0 ? selectionCount : wordCount}
            </span>{" "}
            {selectionCount > 0 ? "selected" : "words"}
          </span>
          <span>
            <span className="font-semibold text-fg">~{tokenCount.toLocaleString()}</span> tokens
          </span>
          <span>
            <span className="font-semibold text-fg">${estimatedCost}</span> est.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {agentRating.breakdown.map(({ label, score: s, max }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="shrink-0 opacity-60 font-medium w-20">{label}</span>
              <span className="flex-1 h-2 bg-paper-softgray dark:bg-paper-dark-surface overflow-hidden">
                <span
                  className="block h-full bg-emerald-500"
                  style={{ width: `${Math.round((s / max) * 100)}%` }}
                />
              </span>
              <span className="opacity-40 w-7 text-right shrink-0 font-medium">{s}/{max}</span>
            </div>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-col gap-2.5 pt-3 border-t border-edge-subtle">
            {categories.map((cat) => {
              const failing = cat.checks.filter((c) => !c.passed && !c.na);
              const allCatPassed = failing.length === 0;
              return (
                <div key={cat.label} className="flex flex-col gap-1.5">
                  <span className="opacity-50 font-semibold uppercase tracking-wide text-[10px]">{cat.label}</span>
                  {allCatPassed ? (
                    <div className="flex items-start gap-1.5">
                      <HiOutlineCheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      <span className="flex-1 opacity-80">All checks passed</span>
                    </div>
                  ) : (
                    failing.map((check) => <ScoreCheckRow key={check.id} check={check} onFix={handleFix} />)
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!allPassed && isAiConfigured && (
          <button
            type="button"
            disabled={isAutoFixing}
            onClick={handleAutoFix}
            className={`flex items-center justify-center gap-1.5 mt-1 pt-3 border-t border-edge-subtle text-sage dark:text-sage font-semibold disabled:opacity-50 disabled:cursor-default ${isAutoFixing ? "" : "hover:underline"}`}
          >
            {isAutoFixing ? (
              <HiOutlineRefresh className="w-3.5 h-3.5 shrink-0 animate-spin" />
            ) : (
              <HiOutlineSparkles className="w-3.5 h-3.5 shrink-0" />
            )}
            {isAutoFixing ? "Fixing…" : "Auto-fix with AI"}
          </button>
        )}

        {allPassed && (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 pt-2 border-t border-edge-subtle">
            Fully structured ✓
          </span>
        )}
        {agentRating.label === "Empty" && (
          <span className="opacity-50 mt-0.5 italic">Start typing to see AI readability tips.</span>
        )}
      </div>
    </DialogModal>
  );
}
