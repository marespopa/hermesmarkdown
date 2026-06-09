"use client";

import React, { useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import Button from "../../components/Button";
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
import toast from "react-hot-toast";
import { 
  HiChevronDown, 
  HiOutlineCheckCircle, 
  HiOutlineCloudUpload, 
  HiOutlineExclamationCircle,
  HiOutlineRefresh
} from "react-icons/hi";

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
    return { score: 0, label: "Empty", colorClass: "text-stone dark:text-fg-faint", tips: [], breakdown: [] };
  }

  let score = 0;
  const tips: string[] = [];

  // ── Section 1: Frontmatter (40 pts) ──────────────────────────────────────

  let fmScore = 0;
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    fmScore += 10;
    const fm = fmMatch[1];

    if (/^title:\s*.+/m.test(fm))         { fmScore += 5; } else { tips.push("Add `title:` to frontmatter"); }
    if (/^status:\s*.+/m.test(fm))        { fmScore += 8; } else { tips.push("Add `status:` to frontmatter (e.g. draft, active)"); }
    if (/^tags:\s*\[.+\]/m.test(fm))      { fmScore += 7; } else { tips.push("Use explicit inline array for tags: `tags: [tag1, tag2]`"); }
    if (/^scope:\s*".+"|^scope:\s*\|/m.test(fm)) { fmScore += 5; } else { tips.push("Add `scope:` — one paragraph describing what this file covers"); }
    if (/^read_when:\s*\[.+\]|^read_when:\n\s+-/m.test(fm)) { fmScore += 5; } else { tips.push("Add `read_when:` — list the tasks or contexts where an agent should load this file"); }
  } else {
    tips.push("Add a YAML frontmatter block (---) with title, status, tags, scope, read_when");
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
  if (pct >= 50) return { score: pct, label: "Good",       colorClass: "text-sage dark:text-sage",               tips, breakdown };
  if (pct >= 25) return { score: pct, label: "Fair",       colorClass: "text-amber-500 dark:text-amber-400",     tips, breakdown };
  return               { score: pct, label: "Weak",        colorClass: "text-stone",    tips, breakdown };
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

  const indexerCount = typeof indexerState === 'object' ? indexerState.count : 0;
  const isIndexing = indexerState === "compiling" || (typeof indexerState === 'object' && indexerState.status === "compiling");

  const wordCount = useMemo(
    () => (content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0),
    [content],
  );

  const tokenCount = useMemo(() => Math.ceil(content.length / 4), [content]);

  const agentRating = useMemo(() => computeAgentScore(content), [content]);

  if (!showStats && !isZenModeActive) return null;

  const barClasses = `group relative shrink-0 pointer-events-auto z-40 select-none paper-grain bg-chrome border-edge-subtle transition-colors duration-200`;
  const innerClasses = `flex items-center justify-between w-full h-full px-4 opacity-60 group-hover:opacity-100 transition-opacity duration-200`;

  if (!activeFilePath) {
    return (
      <footer className={`${barClasses} h-11 md:h-8 ${isZenModeActive ? "border-b" : "border-t"}`}>
        <div className={innerClasses}>
          <div className="w-32 flex items-center">
            <span className="text-[12px] md:text-[10px] font-medium text-fg-faint lowercase tracking-tight">no file open</span>
          </div>

          {isIndexing && (
            <span className="absolute left-32 flex items-center gap-2 whitespace-nowrap" title="Indexing vault…">
              <span className="w-2 h-2 rounded-full border border-fg-faint border-t-sage animate-spin" />
              {indexerCount > 0 && <span className="text-[10px] text-fg-faint tabular-nums font-medium">{indexerCount}</span>}
            </span>
          )}

          {isZenModeActive && (
            <Button
              variant="bare"
              onClick={() => setIsZenModeActive(false)}
              className="h-full px-3 flex items-center text-[11px] font-medium text-fg-muted hover:text-fg active:opacity-60 transition-colors lowercase tracking-tight"
              title="Exit Zen Mode (Esc)"
            >
              exit
            </Button>
          )}
        </div>
      </footer>
    );
  }


  const isDirty = content !== lastSavedContent;
  const isSaving = saveStatus.state === "saving";
  const isError = saveStatus.state === "error";

  let saveIcon: React.ReactNode;
  let saveLabel: string;
  let saveLabelClass: string;

  if (isSaving) {
    saveIcon = <HiOutlineRefresh size={14} className="animate-spin opacity-60" />;
    saveLabel = "saving";
    saveLabelClass = "text-stone";
  } else if (isError) {
    saveIcon = <HiOutlineExclamationCircle size={14} className="text-red-500" />;
    saveLabel = "error";
    saveLabelClass = "text-red-500 dark:text-red-400";
  } else if (isDirty) {
    saveIcon = <HiOutlineCloudUpload size={14} className="opacity-40" />;
    saveLabel = "unsaved";
    saveLabelClass = "text-stone";
  } else {
    saveIcon = <HiOutlineCheckCircle size={14} className="text-emerald-500 opacity-80" />;
    saveLabel = "saved";
    saveLabelClass = "text-emerald-600/80 dark:text-emerald-400/80";
  }

  if (isZenModeActive) {
    return (
      <header className={`${barClasses} h-11 md:h-8 border-b`}>
        <div className={innerClasses}>
        <div className="w-32 flex items-center gap-2">
          {saveIcon}
          <span 
            className={`text-[12px] md:text-[10px] font-medium lowercase tracking-tight ${isError ? 'cursor-pointer hover:underline' : 'cursor-default'} ${saveLabelClass}`}
            title={saveStatus.message}
            onClick={() => {
              if (isError && saveStatus.message) toast.error(saveStatus.message);
            }}
          >
            {saveLabel}
          </span>
        </div>

        {isIndexing && (
          <span className="absolute left-32 flex items-center gap-2 whitespace-nowrap" title="Indexing vault…">
            <span className="w-2 h-2 rounded-full border border-fg-faint border-t-sage animate-spin" />
            {indexerCount > 0 && <span className="text-[10px] text-fg-faint tabular-nums font-medium">{indexerCount}</span>}
          </span>
        )}

        <Button
          variant="bare"
          onClick={() => setShowTokens(v => !v)}
          className="flex-1 h-full flex justify-center items-center text-[12px] md:text-[10px] text-fg-muted cursor-pointer hover:text-fg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] lowercase tracking-tight hover:no-underline"
          title={showTokens ? "Switch to word count" : "Switch to token count (~cost)"}
          aria-label={showTokens ? "Switch to word count" : "Switch to token count (~cost)"}
        >
          {selectionCount > 0 
            ? `[${selectionCount}] words selected`
            : showTokens 
              ? `~${tokenCount} tokens`
              : `${wordCount} words`
          }
        </Button>

        <div className="flex items-center gap-1 h-full">
          <Button
            variant="bare"
            className={`relative h-full px-3 flex items-center gap-1.5 text-[12px] md:text-[10px] cursor-pointer lowercase tracking-tight hover:no-underline ${agentRating.colorClass}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowAiTip(v => !v);
            }}
            aria-label={`Agent readability: ${agentRating.score}/100`}
            aria-expanded={showAiTip}
          >
            ai: {agentRating.label}
            <HiChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${showAiTip ? 'rotate-180' : ''}`} />
            {showAiTip && (
              <>
                <div className="fixed inset-0 z-40 animate-in fade-in duration-200" onClick={(e) => {
                  e.stopPropagation();
                  setShowAiTip(false);
                }} />
                <span 
                  className="absolute top-full right-0 mt-1 flex flex-col rounded-lg bg-paper-light dark:bg-paper-dark border border-edge/50 px-3 py-2 text-[10px] leading-snug text-ink-light dark:text-ink-dark shadow-xl z-50 gap-1.5 w-[min(200px,_calc(100vw_-_1rem))] origin-top-right animate-dropdown-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-semibold mb-1 opacity-90">Agent readability — {agentRating.score}/100</span>
                  {agentRating.breakdown.map(({ label, score: s, max }, idx) => (
                    <span key={label} className="flex items-center gap-2 animate-row-in" style={{ animationDelay: `${idx * 60 + 50}ms` }}>
                      <span className="w-[70px] shrink-0 opacity-60 font-medium">{label}</span>
                      <span className="flex-1 h-1 rounded-full bg-paper-softgray dark:bg-paper-dark-surface overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-emerald-500 animate-grow-x"
                          style={{ 
                            width: `${Math.round((s / max) * 100)}%`,
                            animationDelay: `${idx * 60 + 200}ms` 
                          }}
                        />
                      </span>
                      <span className="opacity-40 w-7 text-right shrink-0 font-medium">{s}/{max}</span>
                    </span>
                  ))}
                  {agentRating.tips.length > 0 && (
                    <span className="flex flex-col gap-0.5 mt-1 pt-1.5 border-t border-paper-softgray dark:border-paper-dark-surface animate-row-in" style={{ animationDelay: `${agentRating.breakdown.length * 60 + 100}ms` }}>
                      {agentRating.tips.map((tip, i) => (
                        <span key={i} className="opacity-60">↳ {tip}</span>
                      ))}
                    </span>
                  )}
                  {agentRating.tips.length === 0 && agentRating.label !== "Empty" && (
                    <span className="opacity-60 mt-0.5 animate-row-in" style={{ animationDelay: `${agentRating.breakdown.length * 60 + 100}ms` }}>Fully structured ✓</span>
                  )}
                  {agentRating.label === "Empty" && (
                    <span className="opacity-50 mt-0.5 italic animate-row-in" style={{ animationDelay: `${agentRating.breakdown.length * 60 + 100}ms` }}>Start typing to see AI readability tips.</span>
                  )}
                </span>
              </>
            )}
          </Button>

          <Button
            variant="bare"
            onClick={() => setIsZenModeActive(false)}
            className="h-full px-3 flex items-center text-[10px] font-medium text-fg-muted hover:text-fg active:opacity-60 transition-colors lowercase tracking-tight"
            title="Exit Zen Mode (Esc)"
          >
            exit
          </Button>
        </div>
        </div>
      </header>
    );
  }

  return (
    <footer className={`${barClasses} h-11 md:h-8 border-t`}>
      <div className={innerClasses}>
      {/* LEFT — save state */}
      <div className="w-32 flex items-center gap-2">
        {saveIcon}
        <span
          className={`text-[12px] md:text-[10px] font-medium lowercase tracking-tight ${isError ? 'cursor-pointer hover:underline' : 'cursor-default'} ${saveLabelClass}`}
          title={saveStatus.message}
          onClick={() => {
            if (isError && saveStatus.message) toast.error(saveStatus.message);
          }}
        >
          {saveLabel}
        </span>
      </div>

      {/* INDEXING — absolute positioned to prevent jump */}
      {isIndexing && (
        <span className="absolute left-32 flex items-center gap-2 whitespace-nowrap" title="Indexing vault…">
          <span className="w-2 h-2 rounded-full border border-fg-faint border-t-sage animate-spin" />
          {indexerCount > 0 && <span className="text-[10px] text-fg-faint tabular-nums font-medium">{indexerCount}</span>}
        </span>
      )}

      <Button
        variant="bare"
        onClick={() => setShowTokens(v => !v)}
        className="flex-1 h-full flex justify-center items-center text-[12px] md:text-[10px] text-fg-muted cursor-pointer hover:text-fg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] lowercase tracking-tight hover:no-underline"
        title={showTokens ? "Switch to word count" : "Switch to token count (~cost)"}
        aria-label={showTokens ? "Switch to word count" : "Switch to token count (~cost)"}
      >
        {selectionCount > 0
          ? `[${selectionCount}] words selected`
          : showTokens
            ? `~${tokenCount} tokens`
            : `${wordCount} words`
        }
      </Button>

      {/* RIGHT — agent readability */}
      <div className="w-32 flex items-center justify-end">
        <Button
          variant="bare"
          className={`relative h-full px-3 flex items-center gap-1.5 text-[12px] md:text-[10px] cursor-pointer lowercase tracking-tight hover:no-underline ${agentRating.colorClass}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowAiTip(v => !v);
          }}
          aria-label={`Agent readability: ${agentRating.score}/100`}
          aria-expanded={showAiTip}
        >
          ai: {agentRating.label}
          <HiChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${showAiTip ? 'rotate-180' : ''}`} />
          {showAiTip && (
            <>
              <div className="fixed inset-0 z-40 bg-black/5" onClick={(e) => {
                e.stopPropagation();
                setShowAiTip(false);
              }} />
              <span 
                className="absolute md:bottom-full md:mb-2 max-md:top-full max-md:mt-2 right-0 flex flex-col rounded-lg bg-paper-light dark:bg-paper-dark border border-edge/50 px-3 py-2 text-[10px] leading-snug text-ink-light dark:text-ink-dark shadow-xl z-50 gap-1.5 w-[min(200px,_calc(100vw_-_1rem))] origin-bottom-right animate-dropdown-in-up"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-semibold mb-1 opacity-90">Agent readability — {agentRating.score}/100</span>
                {agentRating.breakdown.map(({ label, score: s, max }, idx) => (
                  <span key={label} className="flex items-center gap-2 animate-row-in" style={{ animationDelay: `${idx * 60 + 50}ms` }}>
                    <span className="w-[70px] shrink-0 opacity-60 font-medium">{label}</span>
                    <span className="flex-1 h-1 rounded-full bg-paper-softgray dark:bg-paper-dark-surface overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-emerald-500 animate-grow-x"
                        style={{ 
                          width: `${Math.round((s / max) * 100)}%`,
                          animationDelay: `${idx * 60 + 200}ms` 
                        }}
                      />
                    </span>
                    <span className="opacity-40 w-7 text-right shrink-0 font-medium">{s}/{max}</span>
                  </span>
                ))}
                {agentRating.tips.length > 0 && (
                  <span className="flex flex-col gap-0.5 mt-1 pt-1.5 border-t border-paper-softgray dark:border-paper-dark-surface animate-row-in" style={{ animationDelay: `${agentRating.breakdown.length * 60 + 100}ms` }}>
                    {agentRating.tips.map((tip, i) => (
                      <span key={i} className="opacity-60">↳ {tip}</span>
                    ))}
                  </span>
                )}
                {agentRating.tips.length === 0 && agentRating.label !== "Empty" && (
                  <span className="opacity-60 mt-0.5 animate-row-in" style={{ animationDelay: `${agentRating.breakdown.length * 60 + 100}ms` }}>Fully structured ✓</span>
                )}
                {agentRating.label === "Empty" && (
                  <span className="opacity-50 mt-0.5 italic animate-row-in" style={{ animationDelay: `${agentRating.breakdown.length * 60 + 100}ms` }}>Start typing to see AI readability tips.</span>
                )}
              </span>
            </>
          )}
        </Button>
      </div>
      </div>
    </footer>
  );
}
