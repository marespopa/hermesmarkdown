"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import toast from "react-hot-toast";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_isVaultHealthOpen, atom_indexTimestamp, atom_indexerState, atom_isAiConfigured } from "@/app/atoms/ui-atoms";
import { atom_isDriveVault, atom_driveVaultId, atom_drivePathIndex } from "@/app/atoms/drive-atoms";
import { computeVaultHealth, Pillar } from "@/app/utils/vaultHealth";
import { parseVaultIndex, VaultIndex } from "@/app/services/vault-index-reader";
import { listFiles, getFileContent, FOLDER_MIME } from "@/app/services/drive/client";
import { installVaultFiles } from "@/app/services/vault-setup";
import { generateContentFix } from "@/app/services/ai";
import { useFileSystem } from "@/app/hooks/use-file-system";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Tooltip from "@/app/components/Tooltip";
import {
  HiOutlineX,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineSparkles,
  HiOutlineRefresh,
} from "react-icons/hi";

// Per-file gaps that a single generateContentFix pass can safely resolve by
// editing only that file — frontmatter, its own orphan status (by adding an
// outbound `related:` link), and its own numeric-only tags. Broken links,
// duplicate titles, and oversized notes need cross-file judgment and stay
// manual.
interface FixableFile {
  path: string;
  issues: string[];
}

function baseName(path: string): string {
  return path.replace(/^\.\//, "").replace(/^.*\//, "").replace(/\.md$/i, "").trim();
}

function stripAnchor(link: string): string {
  return link.split("#")[0].trim();
}

function relatedListOf(f: any): string[] {
  const raw = f.frontmatter?.related;
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((s: string) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function findFixableFiles(fileMetadata: Record<string, any>): FixableFile[] {
  const files = Object.values(fileMetadata).filter((f: any) => !f.path.startsWith(".hermes/"));

  const inboundLinkCount = new Map<string, number>();
  const inboundRelatedCount = new Map<string, number>();
  for (const f of files as any[]) {
    for (const link of f.links ?? []) {
      const name = baseName(stripAnchor(link));
      inboundLinkCount.set(name, (inboundLinkCount.get(name) ?? 0) + 1);
    }
    for (const rel of relatedListOf(f)) {
      const name = baseName(stripAnchor(rel));
      inboundRelatedCount.set(name, (inboundRelatedCount.get(name) ?? 0) + 1);
    }
  }

  const allTitles = (files as any[]).map((f) => String(f.frontmatter?.title || baseName(f.name)));

  const out: FixableFile[] = [];
  for (const f of files as any[]) {
    const issues: string[] = [];
    if (!f.frontmatter || Object.keys(f.frontmatter).length === 0) {
      issues.push("Add YAML frontmatter with at least a title field.");
    }
    if (!f.frontmatter?.scope) {
      issues.push("Add a `scope` field to frontmatter summarizing what this note covers.");
    }
    if (!f.frontmatter?.read_when) {
      issues.push("Add a `read_when` field to frontmatter describing when an agent should read this note.");
    }

    const name = baseName(f.name);
    const outbound = (f.links?.length ?? 0) + relatedListOf(f).length;
    const inbound = (inboundLinkCount.get(name) ?? 0) + (inboundRelatedCount.get(name) ?? 0);
    if (outbound + inbound === 0) {
      const ownTitle = String(f.frontmatter?.title || name);
      const candidates = allTitles.filter((t) => t && t !== ownTitle).slice(0, 20);
      if (candidates.length > 0) {
        issues.push(
          `This note is orphaned (no inbound or outbound links). Add a \`related:\` frontmatter field listing 1-3 genuinely relevant existing notes, picking only from this list by exact title: ${candidates.join(", ")}. If none are a good fit, pick the single closest match.`,
        );
      }
    }

    const numericTags = (f.tags ?? []).filter((t: string) => /^\d+$/.test(t));
    if (numericTags.length > 0) {
      issues.push(
        `Replace the numeric-only tag(s) ${numericTags.map((t: string) => `#${t}`).join(", ")} in the body with descriptive tag(s) based on this note's content.`,
      );
    }

    if (issues.length > 0) out.push({ path: f.path, issues });
  }
  return out;
}

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

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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
  const isDriveVault = useAtomValue(atom_isDriveVault);
  const driveVaultId = useAtomValue(atom_driveVaultId);
  const drivePathIndex = useAtomValue(atom_drivePathIndex);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const { indexVaultTags } = useFileSystem();
  const [vaultIndex, setVaultIndex] = useState<VaultIndex | null>(null);
  const [indexReadError, setIndexReadError] = useState<string | null>(null);
  const [expandedPillar, setExpandedPillar] = useState<Pillar | null>(null);
  const indexTimestamp = useAtomValue(atom_indexTimestamp);
  const indexerState = useAtomValue(atom_indexerState);
  const isIndexing = indexerState !== "idle";
  const [isFixing, setIsFixing] = useState(false);
  const [fixProgress, setFixProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (!isOpen || (!vaultHandle && !(isDriveVault && driveVaultId))) {
      setVaultIndex(null);
      setIndexReadError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (vaultHandle) {
          let hermesDir;
          try {
            hermesDir = await vaultHandle.getDirectoryHandle(".hermes");
          } catch {
            if (!cancelled) { setVaultIndex(null); setIndexReadError(null); }
            return;
          }
          let fileHandle;
          try {
            fileHandle = await hermesDir.getFileHandle("index.yaml");
          } catch {
            if (!cancelled) { setVaultIndex(null); setIndexReadError(null); }
            return;
          }
          const file = await fileHandle.getFile();
          const text = await file.text();
          if (!cancelled) { setVaultIndex(parseVaultIndex(text)); setIndexReadError(null); }
        } else if (isDriveVault && driveVaultId) {
          const { files: rootFiles } = await listFiles(driveVaultId);
          const hermesFolder = rootFiles.find((f) => f.mimeType === FOLDER_MIME && f.name === ".hermes");
          if (!hermesFolder) {
            if (!cancelled) { setVaultIndex(null); setIndexReadError(null); }
            return;
          }
          const { files: hermesFiles } = await listFiles(hermesFolder.id);
          const indexFile = hermesFiles.find((f) => f.name === "index.yaml");
          if (!indexFile) {
            if (!cancelled) { setVaultIndex(null); setIndexReadError(null); }
            return;
          }
          const text = await getFileContent(indexFile.id);
          if (!cancelled) { setVaultIndex(parseVaultIndex(text)); setIndexReadError(null); }
        }
      } catch (err: any) {
        console.error("Vault Health: failed to read .hermes/index.yaml", err);
        if (!cancelled) {
          setVaultIndex(null);
          setIndexReadError(err?.message || "unknown error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, vaultHandle, isDriveVault, driveVaultId]);

  const tokenStats = useMemo(() => {
    const files = Object.values(fileMetadata).filter((f) => f.tokens && !f.path.startsWith(".hermes/"));
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

  // computeVaultHealth can't tell "genuinely missing" apart from "the read
  // failed" — patch in the real reason here so a transient Drive API error
  // doesn't masquerade as a missing file.
  const displayPillars = useMemo(() => {
    if (!indexReadError) return health.pillars;
    return health.pillars.map((p) =>
      p.pillar !== "Isolate"
        ? p
        : {
            ...p,
            metrics: p.metrics.map((m) =>
              m.id === "index-freshness"
                ? { ...m, reason: `Couldn't verify .hermes/index.yaml (${indexReadError}) — try again` }
                : m,
            ),
          },
    );
  }, [health.pillars, indexReadError]);

  const fixableFiles = useMemo(() => findFixableFiles(fileMetadata), [fileMetadata]);

  const handleFixWithAI = async () => {
    if (fixableFiles.length === 0 || isFixing) return;
    setIsFixing(true);
    setFixProgress({ done: 0, total: fixableFiles.length });

    const fixed: { path: string; description: string; content: string }[] = [];
    let failedCount = 0;

    for (let i = 0; i < fixableFiles.length; i++) {
      const { path, issues } = fixableFiles[i];
      try {
        const meta = fileMetadata[path];
        const file = await meta.handle.getFile();
        const content = await file.text();
        const result = await generateContentFix(content, issues);
        fixed.push({ path, description: "Vault Health AI fix", content: result });
      } catch {
        failedCount++;
      }
      setFixProgress({ done: i + 1, total: fixableFiles.length });
    }

    try {
      if (fixed.length > 0) {
        await installVaultFiles(fixed, vaultHandle, isDriveVault, driveVaultId, drivePathIndex);
        await indexVaultTags();
      }
      if (fixed.length > 0 && failedCount === 0) {
        toast.success(`Fixed ${fixed.length} note(s) with AI.`);
      } else if (fixed.length > 0) {
        toast.success(`Fixed ${fixed.length} note(s); ${failedCount} failed — try again or fix manually.`);
      } else {
        toast.error("Couldn't fix any notes. Check your AI settings and try again.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to write fixed notes back to the vault.");
    } finally {
      setIsFixing(false);
      setFixProgress(null);
    }
  };

  if (!isOpen) return null;

  const guardedClose = () => {
    if (isFixing) return;
    setIsOpen(false);
  };

  return (
    <DialogModal isOpened={isOpen} onClose={guardedClose} styles="max-w-[440px]" hideCloseButton>
      <div className="flex flex-col gap-4 text-sm leading-relaxed">
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold text-ui-caption uppercase tracking-wider text-stone">Vault Health</span>
          <Tooltip label={isFixing ? "Finish fixing to close" : "Close"} position="top">
            <button
              type="button"
              disabled={isFixing}
              onClick={guardedClose}
              className="p-1 rounded-full text-fg-muted hover:text-fg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              aria-label="Close"
            >
              <HiOutlineX size={16} />
            </button>
          </Tooltip>
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
                <Tooltip label={health.label} position="top">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${scoreDotClass(health.label)}`} />
                </Tooltip>
                <span className="font-bold tabular-nums text-[20px] leading-none">{health.composite}</span>
                <span className="opacity-50 font-medium leading-none">/100</span>
                <span className="font-semibold lowercase">{health.label}</span>
              </div>
              <span className="text-ui-footnote text-fg-muted">vault health</span>
            </div>

            <div className="text-ui-footnote text-fg-muted italic">
              {isIndexing
                ? "Index rebuilding…"
                : indexTimestamp
                ? `Index updated ${formatTimeAgo(indexTimestamp)}`
                : "Index not yet written this session"}
            </div>

            <div className="flex flex-col gap-2">
              {displayPillars.map((p) => {
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
                      <Tooltip label={isExpanded ? "Collapse" : "Expand"} position="top">
                        {isExpanded ? (
                          <HiOutlineChevronUp className="w-3.5 h-3.5 shrink-0 opacity-40" />
                        ) : (
                          <HiOutlineChevronDown className="w-3.5 h-3.5 shrink-0 opacity-40" />
                        )}
                      </Tooltip>
                    </button>
                    {isExpanded && (
                      <div className="flex flex-col gap-1 pl-[5.5rem] pr-6">
                        <span className="opacity-40 text-ui-footnote italic mb-0.5">{PILLAR_HINT[p.pillar]}</span>
                        {p.metrics.map((m) => {
                          const passed = m.pass === m.total;
                          return (
                            <div key={m.id} className="flex items-start gap-1.5 text-ui-footnote">
                              <Tooltip label={`${m.pass}/${m.total} passing`} position="top">
                                {passed ? (
                                  <HiOutlineCheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-500 mt-0.5" />
                                ) : (
                                  <HiOutlineExclamationCircle className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                                )}
                              </Tooltip>
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

            {isAiConfigured && fixableFiles.length > 0 && (
              <button
                type="button"
                disabled={isFixing}
                onClick={handleFixWithAI}
                className={`flex items-center justify-center gap-1.5 mt-1 pt-3 border-t border-edge-subtle text-sage dark:text-sage font-semibold disabled:opacity-50 disabled:cursor-default ${isFixing ? "" : "hover:underline"}`}
              >
                {isFixing ? (
                  <HiOutlineRefresh className="w-3.5 h-3.5 shrink-0 animate-spin" />
                ) : (
                  <HiOutlineSparkles className="w-3.5 h-3.5 shrink-0" />
                )}
                {isFixing
                  ? `Fixing ${fixProgress?.done ?? 0}/${fixProgress?.total ?? fixableFiles.length}…`
                  : `Fix ${fixableFiles.length} note(s) with AI`}
              </button>
            )}
          </>
        )}
      </div>
    </DialogModal>
  );
}
