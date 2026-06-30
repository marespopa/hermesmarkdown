"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { atom_content } from "@/app/atoms/atoms";
import LoadingOverlay from "@/app/components/LoadingOverlay/LoadingOverlay";
import Button from "@/app/components/Button/Button.component";
import dynamic from "next/dynamic";

const MarkdownEditor = dynamic(
  () => import("@/app/editor/components/MarkdownEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full flex items-center justify-center bg-paper-light dark:bg-paper-dark rounded-b-xl border border-t-0 border-black/5 dark:border-white/5">
        <div className="text-xs uppercase tracking-widest opacity-30 animate-pulse">
          Initializing Workspace...
        </div>
      </div>
    ),
  },
);

const FilesystemGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative">
    <div className="font-mono text-[11px] leading-relaxed text-left select-none w-full max-w-[260px]">
      <div className="flex items-center gap-1.5 text-sage dark:text-sage font-semibold mb-1">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        hermes_vault/
      </div>
      <div className="border-l border-neutral-300 dark:border-neutral-700 ml-[6px] pl-3 space-y-1">
        {[
          "daily-notes.md",
          "project-ideas.md",
          "ops-log-june.md",
          "api-design.md",
          "meeting-2026.md",
        ].map((name, i) => (
          <div
            key={name}
            className="flex items-center gap-1.5"
            style={{ opacity: 0.65 - i * 0.1 }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {name}
          </div>
        ))}
      </div>
    </div>
    <div className="absolute top-4 right-4 flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
      <span className="text-[9px] font-mono uppercase tracking-widest text-sage dark:text-sage opacity-70">
        Connected
      </span>
    </div>
  </div>
);

const ZenModeGraphic = () => {
  return (
    <div className="w-full h-full flex items-center justify-center p-8 relative overflow-hidden group/zen">
      <div className="absolute inset-0 bg-neutral-50/50 dark:bg-black/20 -z-10" />
      <div className="w-full max-w-[280px]">
        <svg
          width="100%"
          height="120"
          viewBox="0 0 280 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <rect
            x="0"
            y="0"
            width="160"
            height="4"
            rx="2"
            className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity"
          />
          <rect
            x="0"
            y="16"
            width="220"
            height="4"
            rx="2"
            className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity"
          />
          <rect
            x="0"
            y="32"
            width="190"
            height="4"
            rx="2"
            className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity"
          />
          <g>
            <rect
              x="0"
              y="56"
              width="250"
              height="6"
              rx="3"
              className="fill-purple-600 dark:fill-purple-400"
            />
            <rect
              x="0"
              y="56"
              width="250"
              height="6"
              rx="3"
              className="fill-purple-500 dark:fill-purple-400 blur-[8px] opacity-40"
            />
          </g>
          <rect
            x="0"
            y="84"
            width="200"
            height="4"
            rx="2"
            className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity"
          />
          <rect
            x="0"
            y="100"
            width="140"
            height="4"
            rx="2"
            className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity"
          />
          <rect
            x="0"
            y="116"
            width="170"
            height="4"
            rx="2"
            className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity"
          />
        </svg>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-500/10 dark:bg-purple-500/20 blur-[60px] pointer-events-none" />
      <div className="absolute top-4 right-4">
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 font-bold opacity-80">
          Writing Mode
        </span>
      </div>
    </div>
  );
};

const SmartSyntaxGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative select-none">
    <div className="font-mono text-[11px] leading-loose text-left w-full max-w-[280px] space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500">
          #draft
        </span>
        <span className="opacity-50">Redesign API layer</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
          #active
        </span>
        <span className="opacity-50">Vault schema migration</span>
      </div>

      <div className="h-px bg-neutral-300 dark:bg-neutral-700 opacity-40 my-1" />

      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-violet-500/15 text-violet-500">
          #todo
        </span>
        <span className="opacity-50">Auth token refresh</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-500">
          #prog
        </span>
        <span className="opacity-50">API layer rebuild</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-500">
          #done
        </span>
        <span className="opacity-50">Vault schema migration</span>
      </div>

      <div className="h-px bg-neutral-300 dark:bg-neutral-700 opacity-40 my-1" />

      <div className="opacity-50">| Hosting | $120 |</div>
      <div className="opacity-50">| Design | $340 |</div>
      <div className="flex items-center gap-1.5">
        <span className="opacity-50">| =SUM(B2:B3) |</span>
        <span className="text-amber-500 font-semibold">$460.00</span>
        <span className="text-[9px] opacity-30">← live</span>
      </div>

      <div className="h-px bg-neutral-300 dark:bg-neutral-700 opacity-40 my-1" />

      <div className="flex items-center gap-1.5">
        <span className="opacity-50">Sprint ends</span>
        <span className="border-b border-amber-500/60 text-amber-500">
          2026-06-14
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-500 opacity-70"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500 opacity-60">
        Smart Syntax
      </span>
    </div>
  </div>
);

const TableGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative select-none">
    <div className="w-full max-w-[280px] space-y-2">
      {/* Floating toolbar */}
      <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 rounded-lg border border-black/5 dark:border-white/10 px-2 py-1 w-fit mx-auto">
        <span className="text-[9px] font-mono font-bold text-indigo-500 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 cursor-default">
          Edit
        </span>
        <span className="text-[9px] font-mono text-red-400 dark:text-red-400 px-1.5 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-default transition-colors">
          ×Table
        </span>
        <span className="text-[9px] font-mono text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-default transition-colors">
          CSV
        </span>
      </div>
      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-black/5 dark:border-white/10 overflow-hidden group/table">
        <div className="grid grid-cols-3 bg-neutral-50 dark:bg-neutral-900/50 border-b border-black/5 dark:border-white/10 text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
          <div className="p-2 border-r border-black/5 dark:border-white/10 flex items-center justify-between">
            Task
            <span className="text-indigo-500 dark:text-indigo-400 opacity-0 group-hover/table:opacity-100 transition-opacity">
              ↓
            </span>
          </div>
          <div className="p-2 border-r border-black/5 dark:border-white/10 text-center">
            Status
          </div>
          <div className="p-2 text-right text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10">
            Date <span className="opacity-100">↑</span>
          </div>
        </div>
        <div className="grid grid-cols-3 text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
          <div className="p-2 border-r border-b border-black/5 dark:border-white/10">
            Design
          </div>
          <div className="p-2 border-r border-b border-black/5 dark:border-white/10 text-center text-green-500">
            Done
          </div>
          <div className="p-2 border-b border-black/5 dark:border-white/10 text-right opacity-70 bg-indigo-50/20 dark:bg-indigo-500/5">
            06-10
          </div>
        </div>
        <div className="grid grid-cols-3 text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
          <div className="p-2 border-r border-black/5 dark:border-white/10">
            Build
          </div>
          <div className="p-2 border-r border-black/5 dark:border-white/10 text-center text-amber-500">
            WIP
          </div>
          <div className="p-2 border-black/5 dark:border-white/10 text-right opacity-70 bg-indigo-50/20 dark:bg-indigo-500/5">
            06-15
          </div>
        </div>
      </div>
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 opacity-60">
        Table Editor
      </span>
    </div>
  </div>
);

const AgentContextGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-5 relative select-none">
    <div className="font-mono text-[10.5px] leading-relaxed text-left w-full max-w-[290px] space-y-0.5">
      {/* collapsed FM header */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-violet-500 dark:text-violet-400 opacity-70 text-[10px]">
          ✎
        </span>
        <span className="text-neutral-400 dark:text-neutral-500 opacity-50 text-[9px] uppercase tracking-widest font-bold truncate">
          title: "ops-log-june" · active · #trading
        </span>
        <span className="text-neutral-400 dark:text-neutral-500 ml-auto">
          ›
        </span>
      </div>
      <div className="border-l-2 border-violet-400/30 pl-2.5 space-y-0.5">
        <div className="text-neutral-400 dark:text-neutral-500">---</div>
        <div className="flex items-center gap-1.5">
          <span className="text-violet-500 dark:text-violet-400">title:</span>
          <span className="opacity-60">&quot;ops-log-june&quot;</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-violet-500 dark:text-violet-400">status:</span>
          <span className="text-emerald-500">active</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-violet-500 dark:text-violet-400 shrink-0">
            scope:
          </span>
          <span className="opacity-60 truncate">
            &quot;Daily ops for alpha-prod&quot;
          </span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-violet-500 dark:text-violet-400 shrink-0">
            read_when:
          </span>
          <span className="opacity-60">[ops queries]</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-violet-500 dark:text-violet-400 shrink-0">
            related:
          </span>
          <span className="opacity-60">[]</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-violet-500 dark:text-violet-400 shrink-0">
            tags:
          </span>
          <span className="opacity-60">[trading, alpha-prod]</span>
        </div>
        <div className="text-neutral-400 dark:text-neutral-500">---</div>
      </div>

      <div className="h-px bg-neutral-200 dark:bg-neutral-700 opacity-40 my-2" />

      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-500">
          #trading
        </span>
        <span className="opacity-40">from frontmatter</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
          #active
        </span>
        <span className="opacity-40">lifecycle tag</span>
      </div>
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest text-sky-500 opacity-60">
        Agent Context
      </span>
    </div>
  </div>
);

const AgentScoreGraphic = () => (
  <div className="w-full h-full flex flex-col justify-end relative select-none overflow-hidden">
    {/* Score breakdown — mirrors computeAgentScore sections */}
    <div className="flex-1 flex flex-col justify-center gap-2.5 px-8">
      <div className="text-[9px] font-mono font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">
        Agent readability — 95/100
      </div>
      {[
        {
          label: "Frontmatter",
          pct: 100,
          pts: "40/40",
          color: "bg-emerald-500",
        },
        {
          label: "Heading structure",
          pct: 100,
          pts: "30/30",
          color: "bg-emerald-500",
        },
        {
          label: "Typed fences",
          pct: 100,
          pts: "10/10",
          color: "bg-emerald-500",
        },
        { label: "Tables", pct: 100, pts: "5/5", color: "bg-emerald-500" },
        { label: "Bold anchors", pct: 60, pts: "3/5", color: "bg-amber-400" },
      ].map(({ label, pct, pts, color }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[9px] font-mono opacity-50 w-[88px] shrink-0">
            {label}
          </span>
          <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${color} rounded-full transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[9px] font-mono opacity-30 w-8 text-right shrink-0">
            {pts}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const StarterPacksGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-5 relative select-none">
    <div className="w-full max-w-[280px] space-y-2">
      {[
        { icon: "🗂", label: "Empty Vault", active: false },
        { icon: "📓", label: "Notes / PKM", active: true },
        { icon: "⚙️", label: "Engineering", active: false },
        { icon: "💰", label: "Personal Finance", active: false },
      ].map(({ icon, label, active }, i) => (
        <div
          key={label}
          className={`flex items-center gap-3 px-3 h-11 rounded-xl border transition-all ${
            active
              ? "border-sage bg-sage/5 dark:bg-sage/10"
              : "border-black/5 dark:border-white/10 bg-paper-light dark:bg-paper-dark"
          }`}
          style={{ opacity: 1 - i * 0.12 }}
        >
          <span className="text-lg">{icon}</span>
          <span className={`text-[11px] font-bold ${active ? "" : "opacity-60"}`}>{label}</span>
          {active && (
            <span className="ml-auto text-sage text-sm">✓</span>
          )}
        </div>
      ))}
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest text-teal-500 opacity-60">
        Starter Packs
      </span>
    </div>
  </div>
);

const GoogleDriveGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative select-none">
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-sage"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest text-center">
          Local
          <br />
          Vault
        </span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="h-px w-16 bg-neutral-300 dark:bg-neutral-700 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1 bg-neutral-100 dark:bg-neutral-900 text-[10px] text-emerald-500">
            ⇄
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-500"
          >
            <path d="M12 2L2 19h20L12 2z" />
            <path d="M12 22V12" />
            <path d="M2 19l10-7 10 7" />
          </svg>
        </div>
        <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest text-center">
          Google
          <br />
          Drive
        </span>
      </div>
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-500 opacity-60">
        Drive Sync
      </span>
    </div>
  </div>
);

const AIKeyGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative select-none">
    <div className="w-full max-w-[280px] space-y-3">
      <div className="p-3 rounded-lg border border-black/5 dark:border-white/10 bg-surface dark:bg-surface/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-mono font-bold">
              Claude 3.5 Sonnet
            </span>
          </div>
          <span className="text-[9px] opacity-40">Active</span>
        </div>
        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full w-full bg-emerald-500/20" />
        </div>
      </div>
      <div className="p-3 rounded-lg border border-black/5 dark:border-white/10 bg-surface dark:bg-surface/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] font-mono font-bold">
              Gemini 1.5 Pro
            </span>
          </div>
          <span className="text-[9px] opacity-40">Configured</span>
        </div>
        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-amber-500/20" />
        </div>
      </div>
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 opacity-60">
        BYO API Keys
      </span>
    </div>
  </div>
);

// Keeps the landing demo's ship date a couple weeks out from "today" insteadlanding
// of a fixed string that quietly goes stale.
function getDemoShipDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString("en-CA");
}

const DEFAULT_DEMO_CONTENT = `---
title: "Weekly Vault Review"
status: active
scope: "Maintenance checklist, tool subscriptions, and book budget for personal knowledge management."
read_when: 
  - weekly review
  - vault maintenance
  - zettelkasten
  - subscriptions
related: 
  - personal-knowledge-management
  - daily-notes
tags: 
  - review
  - obsidian
  - pkm
---

# Weekly Vault Review

## Maintenance Checklist

- Process inbox notes  #done
- Update daily journal templates  #done
- Organize Zettelkasten orphans  #prog
- Refactor project MOCs  #todo
- Archive completed reading notes  #todo

## Workflow Questions

- Should I transition my task management entirely to Dataview queries, or keep it simple?
- Is the current folder structure getting too deep for quick mobile capture?

## AI Tools

| Service    | Status  | Cost/mo |
| :--------- | :------ | :------ |
| ChatGPT Plus| live    | $20     |
| Claude Pro | live    | $20     |
| Midjourney | pending | $10     |
| Total      |         | $50     |

## Monthly Book Budget

| Title             | Cost |
| :---------------- | :--- |
| Atomic Habits     | $15  |
| Deep Work         | $14  |
| Essentialism      | $12  |
| Total             | $41  |


Next Review date: ${getDemoShipDate(7)}`;

export default function LandingPage() {
  const router = useRouter();
  const realContent = useAtomValue(atom_content);
  const [demoContent, setDemoContent] = useState(DEFAULT_DEMO_CONTENT);
  const [showLoading, setShowLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    router.prefetch("/editor");
  }, [router]);

  const handleStart = () => {
    setShowLoading(true);
    router.push("/editor");
  };

  const problemRef = useRef<HTMLElement>(null);
  const [problemVisible, setProblemVisible] = useState(false);

  useEffect(() => {
    const el = problemRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setProblemVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasContent =
    realContent &&
    realContent.length > 0 &&
    realContent !== DEFAULT_DEMO_CONTENT;

  return (
    <main className="selection:bg-sage/30 overflow-x-hidden font-sans">
      <LoadingOverlay isVisible={showLoading} text="Opening editor..." />

      {/* PERSISTENT RESUME NOTIFICATION */}
      {isMounted && hasContent && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-md">
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 animate-hero-fade-in">
            <div className="space-y-0.5 text-left">
              <p className="text-ui-footnote font-bold uppercase tracking-wider text-sage dark:text-sage">
                Welcome Back
              </p>
              <p className="text-xs opacity-60">
                You have a draft waiting in your local vault.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleStart}
              className="h-9 px-4 !text-ui-footnote"
            >
              Resume Session
            </Button>
          </div>
        </div>
      )}

      {/* --- HERO SECTION --- */}
      <div className="relative pt-24 pb-20 md:pt-32 md:pb-32 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center space-y-12">
          <div className="space-y-6 max-w-3xl animate-hero-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              Notes your agent can navigate{" "}
              <span className="text-neutral-400 dark:text-neutral-600 italic font-serif">
                without burning its context window.
              </span>
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              HermesMarkdown structures your vault so agents know what to read —
              and what to skip. Plain{" "}
              <code className="text-[0.85em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                .md
              </code>{" "}
              files your AI can query like a database, not brute-force through.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="hero"
                onClick={handleStart}
                className="w-full sm:w-auto px-10"
              >
                Open Editor
              </Button>
              <div className="text-ui-footnote uppercase tracking-widest opacity-40 font-bold hidden sm:block">
                Free · No account required
              </div>
            </div>
          </div>

          {/* INTERACTIVE EDITOR PREVIEW */}
          <div className="w-full max-w-4xl relative group animate-hero-fade-in [animation-fill-mode:forwards] [animation-delay:300ms] opacity-0">
            <div className="rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden ring-1 ring-black/5 dark:ring-white/5 transition-all duration-500 group-hover:ring-sage/20">
              <div className="h-10 bg-paper-light dark:bg-paper-dark border-b border-black/5 dark:border-white/10 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/20 border border-red-400/30" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/20 border border-amber-400/30" />
                  <div className="w-3 h-3 rounded-full bg-green-400/20 border border-green-400/30" />
                </div>
                <div className="flex-1 text-ui-footnote font-mono opacity-30 text-center pr-10 overflow-hidden text-ellipsis whitespace-nowrap">
                  landing_demo.md — hermes_vault
                </div>
              </div>
              <div className="h-[400px] md:h-[500px] text-left relative">
                {isMounted && (
                  <MarkdownEditor
                    value={demoContent}
                    onChange={setDemoContent}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- TRUST SIGNALS --- */}
      <section className="py-12 border-y border-black/5 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/30 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center md:justify-between gap-8 opacity-40">
          <div className="flex items-center gap-2 text-ui-footnote font-bold uppercase tracking-[0.3em] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            No Account Required
          </div>
          <div className="flex items-center gap-2 text-ui-footnote font-bold uppercase tracking-[0.3em] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Plain .md Files
          </div>
          <div className="flex items-center gap-2 text-ui-footnote font-bold uppercase tracking-[0.3em] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Structured for Agents
          </div>
          <div className="flex items-center gap-2 text-ui-footnote font-bold uppercase tracking-[0.3em] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Your Keys Stay Local
          </div>
        </div>
      </section>

      {/* --- THE PROBLEM --- */}
      <section
        ref={problemRef}
        className="max-w-3xl mx-auto px-6 py-24 md:py-36 text-center space-y-10"
      >
        <h2
          className={`text-2xl md:text-3xl font-bold tracking-tight opacity-0 [animation-fill-mode:forwards] ${problemVisible ? "animate-hero-fade-in" : ""}`}
        >
          Most Markdown editors are great for writing.{" "}
          <span className="text-neutral-400 dark:text-neutral-600">
            They&apos;re terrible for agents.
          </span>
        </h2>
        <p
          className={`text-neutral-600 dark:text-neutral-400 leading-relaxed text-lg max-w-2xl mx-auto opacity-0 [animation-fill-mode:forwards] [animation-delay:150ms] ${problemVisible ? "animate-hero-fade-in" : ""}`}
        >
          When you drop a vault into Claude Code or Cowork, the agent starts
          from scratch every time. It has no idea which files are relevant, what
          they cover, or when to reach for them. It either burns through your
          context window — or guesses, and pulls the wrong file.
        </p>
        <p
          className={`text-neutral-600 dark:text-neutral-400 leading-relaxed text-lg max-w-2xl mx-auto opacity-0 [animation-fill-mode:forwards] [animation-delay:300ms] ${problemVisible ? "animate-hero-fade-in" : ""}`}
        >
          HermesMarkdown fixes this before the agent ever opens a file.
        </p>
      </section>

      {/* --- FEATURES --- */}
      <div className="max-w-5xl mx-auto px-6 py-24 md:py-32 space-y-32">

        {/* 1. Three-tier read protocol + score — the core differentiator */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="order-last md:order-first aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <AgentScoreGraphic />
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-emerald-600" />
            <h2 className="text-3xl font-bold tracking-tight">
              Agents know what to read before they open a single file
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              HermesMarkdown generates an{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                AGENTS.md
              </code>{" "}
              index your agent reads first. It defines a three-tier protocol:
              scan{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                read_when
              </code>{" "}
              to filter without loading, read{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                scope
              </code>{" "}
              to confirm relevance, load the full file only when needed. Your
              context window stays clean. Retrieval stays precise.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Pull up a live readability score on demand from the command
              palette so you know how well any file is structured — without it
              cluttering the page while you write.
            </p>
          </div>
        </section>

        {/* 2. Starter Packs — onboarding hook */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-teal-500" />
            <h2 className="text-3xl font-bold tracking-tight">
              Create a vault from a starter pack
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Name your vault, pick a parent folder, and choose a starter pack — HermesMarkdown creates the directory, writes the{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                .hermes/
              </code>{" "}
              scaffolding, and navigates you straight into a working vault. Four packs ship out of the box: an empty slate, Notes/PKM (atomic notes and a daily journal template), Engineering (ADRs, bug tracker, and meeting notes), and Personal Finance (budget and debt tables with live formulas).
            </p>
          </div>
          <div className="aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <StarterPacksGraphic />
          </div>
        </section>

        {/* 3. Agent-Specific Frontmatter */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="order-last md:order-first aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <AgentContextGraphic />
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-sky-500" />
            <h2 className="text-3xl font-bold tracking-tight">
              Your notes, structured on your terms
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              The four default fields —{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                scope
              </code>
              ,{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                read_when
              </code>
              ,{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                related
              </code>
              , and{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                tags
              </code>{" "}
              — are a starting point, not a contract. Drop the ones you
              don&apos;t need, rename them, or skip frontmatter entirely.
              HermesMarkdown scores heading structure, typed code fences, and
              table formatting too — a clean plain note still earns a real
              readability rating.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              A wizard walks you through it on new files. Every agent that reads
              your vault benefits from whatever structure you add — permanently.
            </p>
          </div>
        </section>

        {/* 4. Vault Management */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-sage" />
            <h2 className="text-3xl font-bold tracking-tight">
              Filter the whole vault, not just one file
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Open any local directory as a vault and save directly to your
              machine — no upload required. Filter your entire vault by tag,
              date, or word count with Smart Workspaces. A built-in{" "}
              <em>Today&apos;s Work</em> view shows everything you touched in
              the last 24 hours. WikiLinks connect notes vault-wide — type{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                [[note name]]
              </code>{" "}
              and navigate with a click.
            </p>
          </div>
          <div className="aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <FilesystemGraphic />
          </div>
        </section>

        {/* 5. Writing Experience */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="order-last md:order-first aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <ZenModeGraphic />
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-purple-600" />
            <h2 className="text-3xl font-bold tracking-tight">
              Nothing but the page, until you ask for more
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              The app opens straight into a full-screen writing surface — no
              sidebar, no tabs, nothing else. Hover the left edge when you need
              the file tree, or pin it open. Open files side by side and drag
              tabs between panes. Elements in the editor are live — click{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                [ ]
              </code>{" "}
              to toggle tasks, click any date to open a calendar picker, and{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                Ctrl+Click
              </code>{" "}
              any WikiLink to navigate instantly.
            </p>
          </div>
        </section>

        {/* 6. Table Editor */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-indigo-500" />
            <h2 className="text-3xl font-bold tracking-tight">Table editor</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Click inside any Markdown table for a full toolbar. In the editor
              dialog, click a cell to select it and double-click (or hit Enter)
              to type — arrow keys and Tab move between cells. Add rows, sort by
              date or number, export to CSV. Output is clean, auto-padded
              Markdown. Insert a starter grid with{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                /table
              </code>{" "}
              or the{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                {"{table}"}
              </code>{" "}
              shortcode.
            </p>
          </div>
          <div className="aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <TableGraphic />
          </div>
        </section>

        {/* 7. Real formulas & smart syntax */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="order-last md:order-first aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <SmartSyntaxGraphic />
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-amber-500" />
            <h2 className="text-3xl font-bold tracking-tight">
              Real formulas & smart syntax
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Type{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                =SUM(B2:D2)
              </code>{" "}
              into any table cell — Excel-style formulas with cell references,
              ranges, and functions like{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                AVERAGE
              </code>{" "}
              and{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                IF
              </code>
              , computed live right where you're typing. Click cells to build a
              reference instead of typing it — Excel-style point mode — and
              currency symbols in referenced cells carry through to the result
              automatically, no setup needed. Type{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                /
              </code>{" "}
              for the template menu — Daily Note, Meeting Notes, and more.
              Shortcodes expand inline:{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                ..d
              </code>{" "}
              for today&apos;s date,{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                calc()
              </code>{" "}
              for inline expressions.
            </p>
          </div>
        </section>

        {/* 8. Bring Your Own AI */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-indigo-600" />
            <h2 className="text-3xl font-bold tracking-tight">
              You bring your own AI keys
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Connect your Anthropic or Google Gemini API key. HermesMarkdown
              uses it to auto-generate{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                scope
              </code>{" "}
              fields, suggest{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                related
              </code>{" "}
              links, and improve your writing — inline, in the editor. Your keys
              stay in your browser. We never see them or proxy your requests.
            </p>
          </div>
          <div className="aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <AIKeyGraphic />
          </div>
        </section>

        {/* 9. Google Drive — most optional, last */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="order-last md:order-first aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <GoogleDriveGraphic />
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-emerald-600" />
            <h2 className="text-3xl font-bold tracking-tight">
              Google Drive sync
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Opt-in cloud backup. Connect your Google Drive and HermesMarkdown
              syncs in the background — your vault stays on your machine and
              works offline first. Disconnect any time, files stay put. It
              &apos;s an escape hatch, not a dependency.
            </p>
          </div>
        </section>

      </div>

      {/* --- CALL TO ACTION --- */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8 bg-neutral-50 dark:bg-neutral-900/50 text-fg p-8 md:p-16 lg:p-24 rounded-[2rem] md:rounded-[3rem] border border-black/5 dark:border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sage/5 blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 blur-[100px] -ml-32 -mb-32" />

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight relative z-10">
            Own your context. Own your output.
          </h2>
          <p className="opacity-60 max-w-xl mx-auto text-lg relative z-10 font-medium">
            Plain{" "}
            <code className="text-[0.85em] bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded not-italic">
              .md
            </code>{" "}
            files. Structured for agents. Runs in your browser, saves to your
            machine.
          </p>
          <div className="pt-6 relative z-10 flex justify-center">
            <Button
              variant="hero"
              onClick={handleStart}
              className="transition-all"
            >
              Open Editor
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
