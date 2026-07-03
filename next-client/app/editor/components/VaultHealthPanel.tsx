"use client";

import React, { useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_isVaultHealthOpen } from "@/app/atoms/ui-atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import { HiOutlineX } from "react-icons/hi";

function scoreDotClass(label: string): string {
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

function scoreLabel(avg: number): string {
  if (avg >= 75) return "Structured";
  if (avg >= 50) return "Good";
  if (avg >= 25) return "Fair";
  return "Weak";
}

export default function VaultHealthPanel() {
  const [isOpen, setIsOpen] = useAtom(atom_isVaultHealthOpen);
  const fileMetadata = useAtomValue(atom_fileMetadata);

  const stats = useMemo(() => {
    const files = Object.values(fileMetadata).filter((f) => f.tokens);

    let totalFull = 0;
    let totalTiered = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    const unscoped: { path: string; name: string; tokens: number }[] = [];

    for (const f of files) {
      const full = f.tokens?.full ?? 0;
      const hasScope = !!f.frontmatter?.scope;
      const hasReadWhen = !!f.frontmatter?.read_when;
      totalFull += full;
      totalTiered += hasScope && hasReadWhen ? f.tokens.scoped : full;

      if (f.agentScore) {
        scoreSum += f.agentScore.score;
        scoreCount += 1;
      }

      if (!hasScope || !hasReadWhen) {
        unscoped.push({ path: f.path, name: f.name, tokens: full });
      }
    }

    unscoped.sort((a, b) => b.tokens - a.tokens);

    const avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;
    const reduction = totalFull > 0 ? Math.round((1 - totalTiered / totalFull) * 100) : 0;

    return {
      fileCount: files.length,
      totalFull,
      totalTiered,
      reduction,
      avgScore,
      unscoped: unscoped.slice(0, 10),
    };
  }, [fileMetadata]);

  if (!isOpen) return null;

  return (
    <DialogModal isOpened={isOpen} onClose={() => setIsOpen(false)} styles="max-w-[420px]" hideCloseButton>
      <div className="flex flex-col gap-4 text-sm leading-relaxed">
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold text-ui-caption uppercase tracking-wider text-stone">Vault Health</span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-full text-fg-muted hover:text-fg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            <HiOutlineX size={16} />
          </button>
        </div>

        {stats.fileCount === 0 ? (
          <span className="opacity-50 italic">No indexed notes yet.</span>
        ) : (
          <>
            <div className="flex flex-col gap-1 border-t border-edge-subtle pt-3">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-bold tabular-nums text-[20px] leading-none">
                  {stats.totalFull.toLocaleString()}
                </span>
                <span className="opacity-50 text-ui-footnote">tokens full-load</span>
                <span className="opacity-40">→</span>
                <span className="font-bold tabular-nums text-[20px] leading-none text-sage">
                  {stats.totalTiered.toLocaleString()}
                </span>
                <span className="opacity-50 text-ui-footnote">tiered-load</span>
              </div>
              <span className="text-ui-footnote text-fg-muted">
                {stats.reduction > 0
                  ? `A well-scoped agent sees ${stats.reduction}% fewer tokens across ${stats.fileCount} notes.`
                  : `Across ${stats.fileCount} notes.`}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-edge-subtle pt-3">
              <div className="flex items-baseline gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${scoreDotClass(scoreLabel(stats.avgScore))}`} />
                <span className="font-bold tabular-nums text-[20px] leading-none">{stats.avgScore}</span>
                <span className="opacity-50 font-medium leading-none">/100</span>
                <span className="font-semibold lowercase">{scoreLabel(stats.avgScore)}</span>
              </div>
              <span className="text-ui-footnote text-fg-muted">avg. readability</span>
            </div>

            {stats.unscoped.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-edge-subtle pt-3">
                <span className="opacity-50 font-semibold uppercase tracking-wide text-[10px]">
                  Needs scoping ({stats.unscoped.length})
                </span>
                <div className="flex flex-col gap-1.5">
                  {stats.unscoped.map((f) => (
                    <div key={f.path} className="flex items-center justify-between gap-2 text-ui-footnote">
                      <span className="truncate opacity-80">{f.name}</span>
                      <span className="shrink-0 opacity-50 tabular-nums">{f.tokens.toLocaleString()} tok</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DialogModal>
  );
}
