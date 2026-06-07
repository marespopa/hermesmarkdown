"use client";

import React, { useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_content,
  atom_saveStatus,
  atom_showStats,
  atom_isZenModeActive,
  atom_selectionCount,
  atom_lastSavedContent,
  atom_activeFilePath,
} from "@/app/atoms/atoms";
import { atom_indexerState } from "@/app/atoms/ui-atoms";

// --- Agent readability score ---
// Implements the Agent-Readable Markdown spec: frontmatter completeness,
// heading continuity, and syntax hygiene (typed fences, hyphen bullets, bold, tables).

type AgentRating = {
  score: number;
  label: string;
  colorClass: string;
  tips: string[];
  breakdown: { label: string; score: number; max: number }[];
};

function computeAgentScore(content: string): AgentRating {
  if (!content.trim()) {
    return { score: 0, label: "Empty", colorClass: "text-zinc-400 dark:text-zinc-600", tips: [], breakdown: [] };
  }

  let score = 0;
  const tips: string[] = [];

  // ── Section 1: Frontmatter (40 pts) ──────────────────────────────────────

  let fmScore = 0;
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    fmScore += 10;
    const fm = fmMatch[1];

    if (/^id:\s*.+/m.test(fm))       { fmScore += 5; } else { tips.push("Add `id:` to frontmatter"); }
    if (/^title:\s*.+/m.test(fm))    { fmScore += 5; } else { tips.push("Add `title:` to frontmatter"); }
    if (/^status:\s*.+/m.test(fm))   { fmScore += 8; } else { tips.push("Add `status:` to frontmatter (e.g. draft, active)"); }
    if (/^tags:\s*\[.+\]/m.test(fm)) { fmScore += 7; } else { tips.push("Use explicit inline array for tags: `tags: [tag1, tag2]`"); }
    if (/^version:\s*.+/m.test(fm))  { fmScore += 5; } else { tips.push("Add `version:` to frontmatter"); }
  } else {
    tips.push("Add a YAML frontmatter block (---) with id, title, status, tags, version");
  }
  score += fmScore;

  // ── Section 2: Heading structure (30 pts) ────────────────────────────────

  let headScore = 0;
  const headingLines = content.match(/^#{1,6} .+/gm) ?? [];

  if (headingLines.length >= 1) {
    headScore += 8;
  } else {
    tips.push("Add at least one heading");
  }

  if (headingLines.length >= 3) {
    headScore += 7;
  } else if (headingLines.length >= 1) {
    tips.push("Add more headings to structure the document (3+)");
  }

  const levels = (content.match(/^(#{1,6}) /gm) ?? []).map(h => h.trim().length);
  const hasSkip = levels.some((l, i) => i > 0 && l - levels[i - 1] > 1);
  if (!hasSkip && levels.length > 0) {
    headScore += 8;
  } else if (hasSkip) {
    tips.push("Fix heading hierarchy — don't skip levels (e.g. `#` → `###`)");
  }

  const headingNames = headingLines.map(h => h.replace(/^#{1,6} /, "").toLowerCase().trim());
  const headingsUnique = headingNames.length === new Set(headingNames).size;
  if (headingsUnique && headingNames.length > 0) {
    headScore += 7;
  } else if (!headingsUnique) {
    tips.push("Heading names must be unique within the file");
  }
  score += headScore;

  // ── Section 3: Syntax hygiene (30 pts) ───────────────────────────────────

  let syntaxScore = 0;
  const totalFences = (content.match(/^```/gm) ?? []).length;
  const expectedOpeningFences = Math.ceil(totalFences / 2);
  const typedFences = (content.match(/^```[a-zA-Z]/gm) ?? []).length;
  const hasBareBlocks = typedFences < expectedOpeningFences;

  if (typedFences > 0) {
    syntaxScore += 10;
  } else if (totalFences === 0) {
    // No code blocks — no penalty, no tip
  } else {
    tips.push("Add language tags to all code fences (e.g. ` ```typescript `)");
  }

  if (!hasBareBlocks) {
    syntaxScore += 5;
  } else {
    tips.push("Remove bare ` ``` ` blocks — every fence needs a language tag");
  }

  const hasHyphenBullets = /^- /m.test(content);
  const hasAsteriskBullets = /^\* /m.test(content);
  if (hasHyphenBullets && !hasAsteriskBullets) {
    syntaxScore += 5;
  } else if (hasAsteriskBullets) {
    tips.push("Use `-` for bullets instead of `*` (asterisks collide with bold syntax)");
  }

  if (/^\|.+\|/m.test(content)) {
    syntaxScore += 5;
  } else {
    tips.push("Add a summary table for structured data or checklists");
  }

  if (/\*\*[^*]+\*\*/.test(content)) {
    syntaxScore += 5;
  } else {
    tips.push("Use **bold** to mark critical rules or invariants for agent attention");
  }
  score += syntaxScore;

  // ── Rating ────────────────────────────────────────────────────────────────

  const pct = Math.min(100, score);
  const breakdown = [
    { label: "Frontmatter", score: fmScore,     max: 40 },
    { label: "Headings",    score: headScore,    max: 30 },
    { label: "Syntax",      score: syntaxScore,  max: 30 },
  ];

  if (pct >= 75) return { score: pct, label: "Structured", colorClass: "text-emerald-600 dark:text-emerald-400", tips, breakdown };
  if (pct >= 50) return { score: pct, label: "Good",       colorClass: "text-blue-500 dark:text-blue-400",       tips, breakdown };
  if (pct >= 25) return { score: pct, label: "Fair",       colorClass: "text-amber-500 dark:text-amber-400",     tips, breakdown };
  return               { score: pct, label: "Weak",        colorClass: "text-zinc-400 dark:text-zinc-500",       tips, breakdown };
}

// --- StatusBar ---

export default function StatusBar() {
  const content = useAtomValue(atom_content);
  const lastSavedContent = useAtomValue(atom_lastSavedContent);
  const [saveStatus] = useAtom(atom_saveStatus);
  const [showStats] = useAtom(atom_showStats);
  const [isZenModeActive, setIsZenModeActive] = useAtom(atom_isZenModeActive);
  const selectionCount = useAtomValue(atom_selectionCount);
  const indexerState = useAtomValue(atom_indexerState);

  const [showTokens, setShowTokens] = useState(true);
  const [showAiTip, setShowAiTip] = useState(false);

  const activeFilePath = useAtomValue(atom_activeFilePath);

  const wordCount = useMemo(
    () => (content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0),
    [content],
  );

  const tokenCount = useMemo(() => Math.ceil(content.length / 4), [content]);

  const agentRating = useMemo(() => computeAgentScore(content), [content]);

  if (!showStats && !isZenModeActive) return null;

  if (!activeFilePath) {
    return (
      <footer className="relative h-[22px] max-md:h-11 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-3xl flex items-center justify-between px-3 shrink-0 pointer-events-auto z-40 select-none">
        <span className="text-[11px] max-md:text-[12px] font-medium text-zinc-400 dark:text-zinc-500">No file open</span>
        {indexerState === "compiling" && (
          <span className="px-2 h-full flex items-center" title="Indexing vault…">
            <span className="w-2 h-2 rounded-full border border-zinc-400 dark:border-zinc-500 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
          </span>
        )}
      </footer>
    );
  }

  const isDirty = content !== lastSavedContent;
  const isSaving = saveStatus.state === "saving";
  const isError = saveStatus.state === "error";

  let saveLabel: string;
  let saveLabelClass: string;
  if (isSaving) {
    saveLabel = "Saving…";
    saveLabelClass = "text-zinc-400 dark:text-zinc-500";
  } else if (isError) {
    saveLabel = "⚠ Error";
    saveLabelClass = "text-red-500 dark:text-red-400";
  } else if (isDirty) {
    saveLabel = "• Unsaved";
    saveLabelClass = "text-zinc-400 dark:text-zinc-500";
  } else {
    saveLabel = "✓ Saved";
    saveLabelClass = "text-emerald-600 dark:text-emerald-400";
  }

  if (isZenModeActive) {
    return (
      <header className="relative h-11 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-3xl flex items-center justify-between px-4 shrink-0 z-40 select-none">
        <span className={`text-[12px] font-medium ${saveLabelClass}`}>{saveLabel}</span>

        <button
          onClick={() => setShowTokens(v => !v)}
          className="flex-1 h-full flex justify-center items-center text-[12px] text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          title={showTokens ? "Switch to word count" : "Switch to token count (~cost)"}
        >
          {selectionCount > 0 ? (
            <span>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">[{selectionCount}]</strong>{" "}words
            </span>
          ) : showTokens ? (
            <span>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">~{tokenCount}</strong>{" "}tokens
            </span>
          ) : (
            <span>
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">{wordCount}</strong>{" "}words
            </span>
          )}
        </button>

        <div className="flex items-center gap-1 h-full">
          <button
            className={`relative h-full px-3 flex items-center text-[12px] cursor-pointer ${agentRating.colorClass}`}
            onMouseEnter={() => setShowAiTip(true)}
            onMouseLeave={() => setShowAiTip(false)}
            onClick={() => setShowAiTip(v => !v)}
            aria-label={`Agent readability: ${agentRating.score}/100`}
            aria-expanded={showAiTip}
          >
            AI: {agentRating.label}
            {showAiTip && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAiTip(false)} />
                <span className="absolute top-full right-0 mt-1 flex flex-col rounded-lg bg-zinc-900 dark:bg-zinc-700 px-3 py-2 text-[10px] leading-snug text-zinc-100 shadow-lg z-50 gap-1.5 w-[min(200px,_calc(100vw_-_1rem))]">
                  <span className="font-medium mb-1">Agent readability — {agentRating.score}/100</span>
                  {agentRating.breakdown.map(({ label, score: s, max }) => (
                    <span key={label} className="flex items-center gap-2">
                      <span className="w-[70px] shrink-0 opacity-60">{label}</span>
                      <span className="flex-1 h-1 rounded-full bg-zinc-700 dark:bg-zinc-600 overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.round((s / max) * 100)}%` }}
                        />
                      </span>
                      <span className="opacity-40 w-7 text-right shrink-0">{s}/{max}</span>
                    </span>
                  ))}
                  {agentRating.tips.length > 0 && (
                    <span className="flex flex-col gap-0.5 mt-1 pt-1.5 border-t border-zinc-700 dark:border-zinc-600">
                      {agentRating.tips.map((tip, i) => (
                        <span key={i} className="opacity-70">↳ {tip}</span>
                      ))}
                    </span>
                  )}
                  {agentRating.tips.length === 0 && agentRating.label !== "Empty" && (
                    <span className="opacity-70 mt-0.5">Fully structured ✓</span>
                  )}
                  {agentRating.label === "Empty" && (
                    <span className="opacity-70 mt-0.5 italic">Start typing to see AI readability tips.</span>
                  )}
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsZenModeActive(false)}
            className="h-full px-3 flex items-center text-[12px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 active:opacity-60 transition-colors"
            title="Exit Zen Mode (Esc)"
          >
            Exit
          </button>
        </div>
      </header>
    );
  }

  return (
    <footer className="relative h-[22px] max-md:h-11 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-3xl flex items-center justify-between px-3 shrink-0 pointer-events-auto z-40 select-none">
      {/* LEFT — save state */}
      <span className={`text-[11px] max-md:text-[12px] font-medium ${saveLabelClass}`}>{saveLabel}</span>

      {/* CENTER — token / word count (click to toggle) */}
      <button
        onClick={() => setShowTokens(v => !v)}
        className="flex-1 h-full flex justify-center items-center text-[11px] max-md:text-[12px] text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        title={showTokens ? "Switch to word count" : "Switch to token count (~cost)"}
      >
        {selectionCount > 0 ? (
          <span>
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">[{selectionCount}]</strong>{" "}words
          </span>
        ) : showTokens ? (
          <span>
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">~{tokenCount}</strong>{" "}tokens
          </span>
        ) : (
          <span>
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">{wordCount}</strong>{" "}words
          </span>
        )}
      </button>

      {/* RIGHT — agent readability with improvement tips on hover/tap */}
      <div className="flex items-center h-full divide-x divide-zinc-200/50 dark:divide-zinc-800/50">
        {indexerState === "compiling" && (
          <span className="px-2 h-full flex items-center" title="Indexing vault…">
            <span className="w-2 h-2 rounded-full border border-zinc-400 dark:border-zinc-500 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
          </span>
        )}
        <button
          className={`relative px-2 h-full flex items-center text-[11px] max-md:text-[12px] cursor-pointer ${agentRating.colorClass}`}
          onMouseEnter={() => setShowAiTip(true)}
          onMouseLeave={() => setShowAiTip(false)}
          onClick={() => setShowAiTip(v => !v)}
          aria-label={`Agent readability: ${agentRating.score}/100`}
          aria-expanded={showAiTip}
        >
          AI: {agentRating.label}
          {showAiTip && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAiTip(false)} />
              <span className="absolute md:bottom-full md:mb-2 max-md:top-full max-md:mt-2 right-0 flex flex-col rounded-lg bg-zinc-900 dark:bg-zinc-700 px-3 py-2 text-[10px] leading-snug text-zinc-100 shadow-lg z-50 gap-1.5 w-[min(200px,_calc(100vw_-_1rem))]">
                <span className="font-medium mb-1">Agent readability — {agentRating.score}/100</span>
                {agentRating.breakdown.map(({ label, score: s, max }) => (
                  <span key={label} className="flex items-center gap-2">
                    <span className="w-[70px] shrink-0 opacity-60">{label}</span>
                    <span className="flex-1 h-1 rounded-full bg-zinc-700 dark:bg-zinc-600 overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.round((s / max) * 100)}%` }}
                      />
                    </span>
                    <span className="opacity-40 w-7 text-right shrink-0">{s}/{max}</span>
                  </span>
                ))}
                {agentRating.tips.length > 0 && (
                  <span className="flex flex-col gap-0.5 mt-1 pt-1.5 border-t border-zinc-700 dark:border-zinc-600">
                    {agentRating.tips.map((tip, i) => (
                      <span key={i} className="opacity-70">↳ {tip}</span>
                    ))}
                  </span>
                )}
                {agentRating.tips.length === 0 && agentRating.label !== "Empty" && (
                  <span className="opacity-70 mt-0.5">Fully structured ✓</span>
                )}
                {agentRating.label === "Empty" && (
                  <span className="opacity-70 mt-0.5 italic">Start typing to see AI readability tips.</span>
                )}
              </span>
            </>
          )}
        </button>
      </div>
    </footer>
  );
}
