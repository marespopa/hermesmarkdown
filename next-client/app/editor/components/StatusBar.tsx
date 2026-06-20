"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
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
import {
  atom_indexerState,
  atom_indexTimestamp,
  atom_frontmatterWizardOpen,
  atom_frontmatterWizardTargetField,
  atom_isAiConfigured,
  atom_aiActionStatus,
} from "@/app/atoms/ui-atoms";
import { dismissAiActionStatus } from "@/app/services/ai-status";
import { generateContentFix } from "@/app/services/ai";
import { computeAgentScore, ScoreCheck } from "@/app/utils/agentScore";
import toast from "react-hot-toast";
import useIsMobile from "@/app/hooks/use-is-mobile";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import {
  HiChevronDown,
  HiOutlineCheckCircle,
  HiOutlineCloudUpload,
  HiOutlineExclamationCircle,
  HiOutlineRefresh,
  HiOutlineMinusCircle,
  HiOutlineSparkles,
  HiX,
} from "react-icons/hi";

// --- Shared chip primitives ---
// A quiet, text-first style for every secondary control in the bar (save
// state, word/token toggle, exit). No permanent borders or fills — just
// color and a soft hover background — so the agent score badge reads as
// the one deliberate focal point by contrast.

const chipBase =
  "h-7 px-2 flex items-center gap-1.5 rounded-md text-[11px] font-medium tracking-tight transition-colors duration-150 whitespace-nowrap";

function IndexingChip({ count }: { count: number }) {
  return (
    <span className={`${chipBase} text-fg-faint`} title="Indexing vault…">
      <span className="w-2 h-2 rounded-full border border-fg-faint border-t-sage animate-spin" />
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </span>
  );
}

// --- AI status pill ---
// The center-zone, ambient echo of AI activity (toolbar prompts, frontmatter
// generation). Hidden at idle — no permanent "AI: idle" chrome. Thinking and
// done are quiet, colored text only; error gets a soft fill since it needs
// to be noticed and clicked to dismiss.

function AiStatusPill() {
  const [status] = useAtom(atom_aiActionStatus);

  if (status.status === "idle") return null;

  const isError = status.status === "error";
  const text = status.status === "error" ? status.message : status.label;

  return (
    <button
      type="button"
      onClick={() => {
        if (status.status === "error") dismissAiActionStatus(status.seq);
      }}
      className={`${chipBase} animate-pill-fade-in max-w-[260px] ${
        isError
          ? "text-red-600 dark:text-red-400 bg-red-500/10 cursor-pointer"
          : "text-sage cursor-default"
      }`}
      aria-label={isError ? `AI error: ${text}. Click to dismiss.` : text}
    >
      {status.status === "thinking" && (
        <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-sage animate-ai-pulse" />
      )}
      {status.status === "done" && <HiOutlineCheckCircle className="w-3 h-3 shrink-0" />}
      {isError && <HiOutlineExclamationCircle className="w-3 h-3 shrink-0" />}
      <span className="truncate">{text}</span>
    </button>
  );
}

// --- Agent score badge ---
// Rendered outside the rest of the bar's layout flow so its visibility never
// depends on hover or the rest of the bar's state — it's the one element in
// this component meant to be the obvious focal point. A small solid dot
// carries the status color so the badge itself can stay neutral and calm.

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

function AgentScoreBadge({
  agentRating,
  showAiTip,
  setShowAiTip,
  popoverAlign,
  onFix,
  onAutoFix,
  isAiConfigured,
  isAutoFixing,
}: {
  agentRating: ReturnType<typeof computeAgentScore>;
  showAiTip: boolean;
  setShowAiTip: (v: boolean | ((prev: boolean) => boolean)) => void;
  popoverAlign: "up" | "down";
  onFix: (fixField: string) => void;
  onAutoFix: () => void;
  isAiConfigured: boolean;
  isAutoFixing: boolean;
}) {
  // Below md, the bar is too narrow and too close to the screen edge for an
  // anchored popover to stay visible — use a centered dialog instead.
  const isMobile = useIsMobile(767);

  const popoverPositionClass =
    popoverAlign === "up"
      ? "bottom-full mb-2 origin-bottom-right animate-dropdown-in-up"
      : "top-full mt-2 origin-top-right animate-dropdown-in";

  return (
    // Trigger + popover live in their own relative wrapper, as siblings —
    // the popover contains interactive buttons (Fix/Close), and nesting it
    // inside the trigger <button> would put a <button> inside a <button>,
    // which is invalid HTML and breaks hydration.
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowAiTip((v) => !v);
        }}
        className={`h-7 pl-2 pr-2 flex items-center gap-1.5 rounded-md text-[11px] font-semibold tracking-tight cursor-pointer transition-colors duration-150 text-fg-muted hover:bg-paper-softgray/70 dark:hover:bg-paper-dark-surface/70 ${showAiTip ? "bg-paper-softgray/70 dark:bg-paper-dark-surface/70" : ""}`}
        aria-label={`Agent readability: ${agentRating.score}/100, ${agentRating.label}`}
        aria-expanded={showAiTip}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${agentDotClass(agentRating.label)}`} />
        <span className="tabular-nums text-fg">{agentRating.score}</span>
        <span className="hidden sm:inline opacity-70 lowercase font-medium">{agentRating.label}</span>
        <HiChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-200 ${showAiTip ? "rotate-180" : ""}`} />
      </button>

      {showAiTip && isMobile && (
        <DialogModal isOpened={showAiTip} onClose={() => setShowAiTip(false)} styles="max-w-[340px]">
          <AgentScorePanel
            agentRating={agentRating}
            onFix={onFix}
            onClose={() => setShowAiTip(false)}
            onAutoFix={isAiConfigured ? onAutoFix : undefined}
            isAutoFixing={isAutoFixing}
            variant="dialog"
          />
        </DialogModal>
      )}

      {showAiTip && !isMobile && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/5 animate-in fade-in duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setShowAiTip(false);
            }}
          />
          <div
            className={`absolute right-0 ${popoverPositionClass} flex flex-col rounded-xl bg-paper-light dark:bg-paper-dark border border-edge-subtle px-3.5 py-3 text-[11px] leading-snug text-ink-light dark:text-ink-dark shadow-xl z-50 gap-1.5 w-[min(300px,_calc(100vw_-_1rem))]`}
            onClick={(e) => e.stopPropagation()}
          >
            <AgentScorePanel
              agentRating={agentRating}
              onFix={onFix}
              onClose={() => setShowAiTip(false)}
              onAutoFix={isAiConfigured ? onAutoFix : undefined}
              isAutoFixing={isAutoFixing}
              variant="popover"
            />
          </div>
        </>
      )}
    </div>
  );
}

// --- Agent score breakdown content (shared between zen and normal mode popovers) ---

function ScoreCheckRow({
  check,
  onFix,
  compact,
}: {
  check: ScoreCheck;
  onFix: (fixField: string) => void;
  compact: boolean;
}) {
  const iconSize = compact ? "w-3 h-3" : "w-3.5 h-3.5";
  const icon = check.na ? (
    <HiOutlineMinusCircle className={`${iconSize} shrink-0 opacity-40`} />
  ) : check.passed ? (
    <HiOutlineCheckCircle className={`${iconSize} shrink-0 text-emerald-500`} />
  ) : (
    <HiOutlineExclamationCircle className={`${iconSize} shrink-0 text-amber-500`} />
  );

  return (
    <div className={`flex items-start ${compact ? "gap-1.5" : "gap-2"}`}>
      {icon}
      <span className="flex-1 opacity-80">{check.reason}</span>
      {!check.passed && !check.na && check.fixField && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFix(check.fixField!);
          }}
          className="shrink-0 text-sage dark:text-sage font-medium hover:underline"
        >
          Fix
        </button>
      )}
    </div>
  );
}

function AgentScorePanel({
  agentRating,
  onFix,
  onClose,
  onAutoFix,
  isAutoFixing,
  variant = "popover",
}: {
  agentRating: ReturnType<typeof computeAgentScore>;
  onFix: (fixField: string) => void;
  onClose: () => void;
  onAutoFix?: () => void;
  isAutoFixing?: boolean;
  variant?: "popover" | "dialog";
}) {
  const categories: { label: string; checks: ScoreCheck[] }[] = ["Frontmatter", "Headings", "Syntax"]
    .map((category) => ({
      label: category,
      checks: agentRating.checks.filter((c) => c.category === category),
    }))
    .filter((c) => c.checks.length > 0);

  const allPassed = agentRating.tips.length === 0 && agentRating.label !== "Empty";
  const isDialog = variant === "dialog";

  // The dialog has its own room to breathe (DialogModal's padding + close
  // button), so it gets larger text and looser spacing than the compact
  // popover, which has to fit inside a small anchored bubble.
  const rootClasses = isDialog ? "flex flex-col gap-3 text-sm leading-relaxed" : "flex flex-col gap-1.5 text-[11px] leading-snug";

  return (
    <div className={rootClasses}>
      {/* Header — score takes visual priority over the close affordance */}
      <div className={`flex items-center ${isDialog ? "" : "justify-between gap-2 -mx-1 -mt-0.5 px-1"}`}>
        <div className="flex items-baseline gap-1.5">
          <span className={`font-bold tabular-nums leading-none opacity-95 ${isDialog ? "text-[28px]" : "text-[18px]"}`}>{agentRating.score}</span>
          <span className="opacity-50 font-medium leading-none">/100</span>
          <span className={`font-semibold lowercase ${agentRating.colorClass}`}>{agentRating.label}</span>
        </div>
        {!isDialog && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 opacity-40 hover:opacity-80 transition-opacity p-0.5 -mr-1"
          >
            <HiX className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className={`flex flex-col ${isDialog ? "gap-2" : "gap-1"}`}>
        {agentRating.breakdown.map(({ label, score: s, max }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`shrink-0 opacity-60 font-medium ${isDialog ? "w-20" : "w-[70px]"}`}>{label}</span>
            <span className={`flex-1 rounded-full bg-paper-softgray dark:bg-paper-dark-surface overflow-hidden ${isDialog ? "h-2" : "h-1.5"}`}>
              <span
                className="block h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.round((s / max) * 100)}%` }}
              />
            </span>
            <span className="opacity-40 w-7 text-right shrink-0 font-medium">{s}/{max}</span>
          </div>
        ))}
      </div>

      {categories.length > 0 && (
        <div className={`flex flex-col ${isDialog ? "gap-2.5 pt-3" : "gap-1.5 pt-2"} border-t border-paper-softgray dark:border-paper-dark-surface`}>
          {categories.map((cat) => {
            const failing = cat.checks.filter((c) => !c.passed && !c.na);
            const allCatPassed = failing.length === 0;
            return (
              <div key={cat.label} className={`flex flex-col ${isDialog ? "gap-1.5" : "gap-1"}`}>
                <span className={`opacity-50 font-semibold uppercase tracking-wide ${isDialog ? "text-[10px]" : "text-[9px]"}`}>{cat.label}</span>
                {allCatPassed ? (
                  <div className="flex items-start gap-1.5">
                    <HiOutlineCheckCircle className={`${isDialog ? "w-3.5 h-3.5" : "w-3 h-3"} shrink-0 text-emerald-500`} />
                    <span className="flex-1 opacity-80">All checks passed</span>
                  </div>
                ) : (
                  failing.map((check) => (
                    <ScoreCheckRow key={check.id} check={check} onFix={onFix} compact={!isDialog} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {!allPassed && onAutoFix && (
        <button
          type="button"
          disabled={isAutoFixing}
          onClick={(e) => {
            e.stopPropagation();
            onAutoFix();
          }}
          className={`flex items-center justify-center gap-1.5 ${isDialog ? "mt-1 pt-3" : "mt-0.5 pt-2"} border-t border-paper-softgray dark:border-paper-dark-surface text-sage dark:text-sage font-semibold disabled:opacity-50 disabled:cursor-default ${isAutoFixing ? "" : "hover:underline"}`}
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
        <span className="text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 pt-1.5 border-t border-paper-softgray dark:border-paper-dark-surface">
          Fully structured ✓
        </span>
      )}
      {agentRating.label === "Empty" && (
        <span className="opacity-50 mt-0.5 italic">Start typing to see AI readability tips.</span>
      )}
    </div>
  );
}

// --- StatusBar ---

export default function StatusBar() {
  const [content, setContent] = useAtom(atom_content);
  const lastSavedContent = useAtomValue(atom_lastSavedContent);
  const [saveStatus] = useAtom(atom_saveStatus);
  const [showStats] = useAtom(atom_showStats);
  const [isZenModeActive, setIsZenModeActive] = useAtom(atom_isZenModeActive);
  const selectionCount = useAtomValue(atom_selectionCount);
  const indexerState = useAtomValue(atom_indexerState);

  const indexTimestamp = useAtomValue(atom_indexTimestamp);
  const [showTokens, setShowTokens] = useState(true);
  const [showAiTip, setShowAiTip] = useState(false);
  const [showIndexUpdated, setShowIndexUpdated] = useState(false);
  const prevIndexTimestampRef = useRef<number | null>(null);

  const activeFilePath = useAtomValue(atom_activeFilePath);
  const setFrontmatterWizardOpen = useAtom(atom_frontmatterWizardOpen)[1];
  const setFrontmatterWizardTargetField = useAtom(atom_frontmatterWizardTargetField)[1];
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const [isAutoFixing, setIsAutoFixing] = useState(false);

  const handleFix = (fixField: string) => {
    if (!activeFilePath) return;
    setFrontmatterWizardTargetField(fixField);
    setFrontmatterWizardOpen(activeFilePath);
    setShowAiTip(false);
  };

  const handleAutoFix = async () => {
    if (!activeFilePath) return;
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

  useEffect(() => {
    if (indexTimestamp && indexTimestamp !== prevIndexTimestampRef.current) {
      prevIndexTimestampRef.current = indexTimestamp;
      setShowIndexUpdated(true);
      const timer = setTimeout(() => setShowIndexUpdated(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [indexTimestamp]);

  const indexerCount = typeof indexerState === 'object' ? indexerState.count : 0;
  const isIndexing = indexerState === "compiling" || (typeof indexerState === 'object' && indexerState.status === "compiling");

  const wordCount = useMemo(
    () => (content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0),
    [content],
  );

  const tokenCount = useMemo(() => Math.ceil(content.length / 4), [content]);

  const agentRating = useMemo(() => computeAgentScore(content), [content]);

  if (!showStats && !isZenModeActive) return null;

  // Matches the sidebar and tab bar surface exactly (bg-paper-pale/dark +
  // paper-grain) so the status bar reads as the same system layer as the
  // rest of the editor chrome, not a separate floating element.
  const barClasses = `relative shrink-0 pointer-events-auto z-40 select-none paper-grain bg-paper-pale dark:bg-paper-dark border-edge-subtle transition-colors duration-200`;
  const innerClasses = `flex items-center justify-between w-full h-full px-3 gap-2 text-fg-muted`;

  const metricLabel = selectionCount > 0
    ? `[${selectionCount}] words selected`
    : showTokens
      ? `~${tokenCount} tokens`
      : `${wordCount} words`;

  if (!activeFilePath) {
    return (
      <footer className={`${barClasses} h-11 md:h-8 ${isZenModeActive ? "border-b" : "border-t"}`}>
        <div className={innerClasses}>
          <span className={`${chipBase} text-fg-faint`}>no file open</span>
          {isIndexing && <IndexingChip count={indexerCount} />}
          <span className="flex-1" />
          {isZenModeActive && (
            <Button
              variant="bare"
              onClick={() => setIsZenModeActive(false)}
              className={`${chipBase} text-fg-muted hover:text-fg hover:bg-paper-softgray/70 dark:hover:bg-paper-dark-surface/70 lowercase hover:no-underline`}
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
    saveIcon = <HiOutlineRefresh size={13} className="animate-spin opacity-60" />;
    saveLabel = "saving";
    saveLabelClass = "text-stone";
  } else if (isError) {
    saveIcon = <HiOutlineExclamationCircle size={13} className="text-red-500" />;
    saveLabel = "error";
    saveLabelClass = "text-red-500 dark:text-red-400";
  } else if (isDirty) {
    saveIcon = <HiOutlineCloudUpload size={13} className="opacity-40" />;
    saveLabel = "unsaved";
    saveLabelClass = "text-stone";
  } else {
    saveIcon = <HiOutlineCheckCircle size={13} className="text-emerald-500 opacity-80" />;
    saveLabel = "saved";
    saveLabelClass = "text-emerald-600/80 dark:text-emerald-400/80";
  }

  const saveChip = (
    <span
      className={`${chipBase} font-medium lowercase ${isError ? "cursor-pointer hover:bg-red-500/10" : ""} ${saveLabelClass}`}
      title={saveStatus.message}
      onClick={() => {
        if (isError && saveStatus.message) toast.error(saveStatus.message);
      }}
    >
      {saveIcon}
      {saveLabel}
    </span>
  );

  const metricChip = (
    <Button
      variant="bare"
      onClick={() => setShowTokens((v) => !v)}
      className={`${chipBase} text-fg-muted hover:text-fg hover:bg-paper-softgray/70 dark:hover:bg-paper-dark-surface/70 lowercase hover:no-underline`}
      title={showTokens ? "Switch to word count" : "Switch to token count (~cost)"}
      aria-label={showTokens ? "Switch to word count" : "Switch to token count (~cost)"}
    >
      {metricLabel}
    </Button>
  );

  if (isZenModeActive) {
    return (
      <header className={`${barClasses} h-11 md:h-8 border-b`}>
        <div className={innerClasses}>
          {/* Left zone */}
          <div className="flex items-center gap-2">
            {saveChip}
            {isIndexing && <IndexingChip count={indexerCount} />}
          </div>

          {/* Center zone — empty and weightless unless AI is doing something */}
          <span className="flex-1 flex justify-center">
            <AiStatusPill />
          </span>

          {/* Right zone */}
          <div className="flex items-center gap-1.5">
            {metricChip}
            <AgentScoreBadge
              agentRating={agentRating}
              showAiTip={showAiTip}
              setShowAiTip={setShowAiTip}
              onFix={handleFix}
              onAutoFix={handleAutoFix}
              isAiConfigured={isAiConfigured}
              isAutoFixing={isAutoFixing}
              popoverAlign="down"
            />
            <Button
              variant="bare"
              onClick={() => setIsZenModeActive(false)}
              className={`${chipBase} text-fg-muted hover:text-fg hover:bg-paper-softgray/70 dark:hover:bg-paper-dark-surface/70 lowercase hover:no-underline`}
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
        {/* Left zone */}
        <div className="flex items-center gap-2">
          {saveChip}
          {isIndexing ? (
            <IndexingChip count={indexerCount} />
          ) : showIndexUpdated && indexTimestamp ? (
            <span className={`${chipBase} text-fg-faint`} title="Vault index written to .hermes/index.yaml">
              index updated {new Date(indexTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
        </div>

        {/* Center zone — empty and weightless unless AI is doing something */}
        <span className="flex-1 flex justify-center">
          <AiStatusPill />
        </span>

        {/* Right zone — vault health is the natural neighbor of AI action state */}
        <div className="flex items-center gap-1.5">
          {metricChip}
          <AgentScoreBadge
            agentRating={agentRating}
            showAiTip={showAiTip}
            setShowAiTip={setShowAiTip}
            onFix={handleFix}
            onAutoFix={handleAutoFix}
            isAiConfigured={isAiConfigured}
            isAutoFixing={isAutoFixing}
            popoverAlign="up"
          />
        </div>
      </div>
    </footer>
  );
}
