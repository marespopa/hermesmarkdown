"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_isVaultHealthOpen } from "@/app/atoms/ui-atoms";
import { computeVaultHealth, Pillar } from "@/app/utils/vaultHealth";
import { parseVaultIndex, VaultIndex } from "@/app/services/vault-index-reader";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import { HiOutlineX, HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineChevronDown, HiOutlineChevronUp } from "react-icons/hi";

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

const PILLAR_HINT: Record<Pillar, string> = {
  Write: "Structure exists",
  Select: "Agents can find the right thing",
  Compress: "Context stays cheap",
  Isolate: "Index integrity",
};

export default function VaultHealthPanel() {
  const [isOpen, setIsOpen] = useAtom(atom_isVaultHealthOpen);
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const [vaultIndex, setVaultIndex] = useState<VaultIndex | null>(null);
  const [expandedPillar, setExpandedPillar] = useState<Pillar | null>(null);

  useEffect(() => {
    if (!isOpen || !vaultHandle) {
      setVaultIndex(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const hermesDir = await vaultHandle.getDirectoryHandle(".hermes");
        const fileHandle = await hermesDir.getFileHandle("index.yaml");
        const file = await fileHandle.getFile();
        const text = await file.text();
        if (!cancelled) setVaultIndex(parseVaultIndex(text));
      } catch {
        if (!cancelled) setVaultIndex(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, vaultHandle]);

  const tokenStats = useMemo(() => {
    const files = Object.values(fileMetadata).filter((f) => f.tokens);
    let totalFull = 0;
    let totalTiered = 0;
    const unscoped: { path: string; name: string; tokens: number }[] = [];

    for (const f of files) {
      const full = f.tokens?.full ?? 0;
      const hasScope = !!f.frontmatter?.scope;
      const hasReadWhen = !!f.frontmatter?.read_when;
      totalFull += full;
      totalTiered += hasScope && hasReadWhen ? f.tokens.scoped : full;
      if (!hasScope || !hasReadWhen) unscoped.push({ path: f.path, name: f.name, tokens: full });
    }

    unscoped.sort((a, b) => b.tokens - a.tokens);
    const reduction = totalFull > 0 ? Math.round((1 - totalTiered / totalFull) * 100) : 0;

    return { fileCount: files.length, totalFull, totalTiered, reduction, unscoped: unscoped.slice(0, 10) };
  }, [fileMetadata]);

  const health = useMemo(() => computeVaultHealth(fileMetadata, vaultIndex), [fileMetadata, vaultIndex]);

  if (!isOpen) return null;

  return (
    <DialogModal isOpened={isOpen} onClose={() => setIsOpen(false)} styles="max-w-[440px]" hideCloseButton>
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

        {tokenStats.fileCount === 0 ? (
          <span className="opacity-50 italic">No indexed notes yet.</span>
        ) : (
          <>
            <div className="flex flex-col gap-1 border-t border-edge-subtle pt-3">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-bold tabular-nums text-[20px] leading-none">
                  {tokenStats.totalFull.toLocaleString()}
                </span>
                <span className="opacity-50 text-ui-footnote">tokens full-load</span>
                <span className="opacity-40">→</span>
                <span className="font-bold tabular-nums text-[20px] leading-none text-sage">
                  {tokenStats.totalTiered.toLocaleString()}
                </span>
                <span className="opacity-50 text-ui-footnote">tiered-load</span>
              </div>
              <span className="text-ui-footnote text-fg-muted">
                {tokenStats.reduction > 0
                  ? `A well-scoped agent sees ${tokenStats.reduction}% fewer tokens across ${tokenStats.fileCount} notes.`
                  : `Across ${tokenStats.fileCount} notes.`}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-edge-subtle pt-3">
              <div className="flex items-baseline gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${scoreDotClass(health.label)}`} />
                <span className="font-bold tabular-nums text-[20px] leading-none">{health.composite}</span>
                <span className="opacity-50 font-medium leading-none">/100</span>
                <span className="font-semibold lowercase">{health.label}</span>
              </div>
              <span className="text-ui-footnote text-fg-muted">vault health</span>
            </div>

            <div className="flex flex-col gap-2">
              {health.pillars.map((p) => {
                const failing = p.metrics.filter((m) => m.pass < m.total);
                const isExpanded = expandedPillar === p.pillar;
                return (
                  <div key={p.pillar} className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExpandedPillar(isExpanded ? null : p.pillar)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <span className="shrink-0 opacity-70 font-medium w-20">{p.pillar}</span>
                      <span className="flex-1 h-2 bg-paper-softgray dark:bg-paper-dark-surface overflow-hidden">
                        <span
                          className={`block h-full ${p.score === 100 ? "bg-emerald-500" : "bg-amber-400"}`}
                          style={{ width: `${p.score}%` }}
                        />
                      </span>
                      <span className="opacity-40 w-9 text-right shrink-0 font-medium">{p.score}</span>
                      {isExpanded ? (
                        <HiOutlineChevronUp className="w-3.5 h-3.5 shrink-0 opacity-40" />
                      ) : (
                        <HiOutlineChevronDown className="w-3.5 h-3.5 shrink-0 opacity-40" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="flex flex-col gap-1 pl-[5.5rem] pr-6">
                        <span className="opacity-40 text-ui-footnote italic mb-0.5">{PILLAR_HINT[p.pillar]}</span>
                        {p.metrics.map((m) => {
                          const passed = m.pass === m.total;
                          return (
                            <div key={m.id} className="flex items-start gap-1.5 text-ui-footnote">
                              {passed ? (
                                <HiOutlineCheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-500 mt-0.5" />
                              ) : (
                                <HiOutlineExclamationCircle className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                              )}
                              <span className="flex-1 opacity-80">{passed ? m.label : m.reason}</span>
                            </div>
                          );
                        })}
                        {failing.length === 0 && p.metrics.length === 0 && (
                          <span className="opacity-50 italic">No data</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {tokenStats.unscoped.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-edge-subtle pt-3">
                <span className="opacity-50 font-semibold uppercase tracking-wide text-[10px]">
                  Needs scoping ({tokenStats.unscoped.length})
                </span>
                <div className="flex flex-col gap-1.5">
                  {tokenStats.unscoped.map((f) => (
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
