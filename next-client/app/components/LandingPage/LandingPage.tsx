"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { atom_content } from "@/app/atoms/atoms";
import LoadingOverlay from "@/app/components/LoadingOverlay/LoadingOverlay";
import Button from "@/app/components/Button/Button.component";
import dynamic from "next/dynamic";

const MarkdownEditor = dynamic(() => import("@/app/editor/components/MarkdownEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 rounded-b-xl border border-t-0 border-black/5 dark:border-white/5">
      <div className="text-xs uppercase tracking-widest opacity-30 animate-pulse">
        Initializing Workspace...
      </div>
    </div>
  ),
});

const FilesystemGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative">
    <div className="font-mono text-[11px] leading-relaxed text-left select-none w-full max-w-[260px]">
      <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 font-semibold mb-1">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        hermes_vault/
      </div>
      <div className="border-l border-neutral-300 dark:border-neutral-700 ml-[6px] pl-3 space-y-1">
        {["daily-notes.md", "project-ideas.md", "ops-log-june.md", "api-design.md", "meeting-2026.md"].map((name, i) => (
          <div key={name} className="flex items-center gap-1.5" style={{ opacity: 0.65 - i * 0.1 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            {name}
          </div>
        ))}
      </div>
    </div>
    <div className="absolute top-4 right-4 flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      <span className="text-[9px] font-mono uppercase tracking-widest text-blue-500 dark:text-blue-400 opacity-70">Connected</span>
    </div>
  </div>
);

const ZenModeGraphic = () => {
  return (
    <div className="w-full h-full flex items-center justify-center p-8 relative overflow-hidden group/zen">
      <div className="absolute inset-0 bg-neutral-50/50 dark:bg-black/20 -z-10" />
      <div className="w-full max-w-[280px]">
        <svg width="100%" height="120" viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
          <rect x="0" y="0" width="160" height="4" rx="2" className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity" />
          <rect x="0" y="16" width="220" height="4" rx="2" className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity" />
          <rect x="0" y="32" width="190" height="4" rx="2" className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity" />
          <g>
             <rect x="0" y="56" width="250" height="6" rx="3" className="fill-purple-600 dark:fill-purple-400" />
             <rect x="0" y="56" width="250" height="6" rx="3" className="fill-purple-500 dark:fill-purple-400 blur-[8px] opacity-40" />
          </g>
          <rect x="0" y="84" width="200" height="4" rx="2" className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity" />
          <rect x="0" y="100" width="140" height="4" rx="2" className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity" />
          <rect x="0" y="116" width="170" height="4" rx="2" className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity" />
        </svg>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-500/10 dark:bg-purple-500/20 blur-[60px] pointer-events-none" />
      <div className="absolute top-4 right-4">
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 font-bold opacity-80">Zen Mode</span>
      </div>
    </div>
  );
};

const SmartSyntaxGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative select-none">
    <div className="font-mono text-[11px] leading-loose text-left w-full max-w-[280px] space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500">#draft</span>
        <span className="opacity-50">Redesign API layer</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">#active</span>
        <span className="opacity-50">Vault schema migration</span>
      </div>

      <div className="h-px bg-neutral-300 dark:bg-neutral-700 opacity-40 my-1" />

      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-violet-500/15 text-violet-500">#todo</span>
        <span className="opacity-50">Auth token refresh</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-500">#prog</span>
        <span className="opacity-50">API layer rebuild</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-500">#done</span>
        <span className="opacity-50">Vault schema migration</span>
      </div>

      <div className="h-px bg-neutral-300 dark:bg-neutral-700 opacity-40 my-1" />

      <div className="opacity-50">- Hosting: $120</div>
      <div className="opacity-50">- Design: $340</div>
      <div className="flex items-center gap-1.5">
        <span className="opacity-50">Total:</span>
        <span className="text-amber-500 font-semibold">$460.00</span>
        <span className="text-[9px] opacity-30">← auto</span>
      </div>

      <div className="h-px bg-neutral-300 dark:bg-neutral-700 opacity-40 my-1" />

      <div className="flex items-center gap-1.5">
        <span className="opacity-50">Sprint ends</span>
        <span className="border-b border-amber-500/60 text-amber-500">2026-06-14</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 opacity-70">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500 opacity-60">Smart Syntax</span>
    </div>
  </div>
);

const TableGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative select-none">
    <div className="w-full max-w-[280px] space-y-2">
      {/* Floating toolbar */}
      <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 rounded-lg border border-black/5 dark:border-white/10 shadow-md px-2 py-1 w-fit mx-auto">
        {["+ Col", "+ Row", "↑↓ Sort", "CSV"].map((label) => (
          <span key={label} className="text-[9px] font-mono text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-default transition-colors">
            {label}
          </span>
        ))}
        <span className="text-[9px] font-mono font-bold text-indigo-500 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 cursor-default ml-1">
          Edit
        </span>
      </div>
      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-black/5 dark:border-white/10 overflow-hidden group/table">
        <div className="grid grid-cols-3 bg-neutral-50 dark:bg-neutral-900/50 border-b border-black/5 dark:border-white/10 text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
          <div className="p-2 border-r border-black/5 dark:border-white/10 flex items-center justify-between">
            Task
            <span className="text-indigo-500 dark:text-indigo-400 opacity-0 group-hover/table:opacity-100 transition-opacity">↓</span>
          </div>
          <div className="p-2 border-r border-black/5 dark:border-white/10 text-center">Status</div>
          <div className="p-2 text-right text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10">Date <span className="opacity-100">↑</span></div>
        </div>
        <div className="grid grid-cols-3 text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
          <div className="p-2 border-r border-b border-black/5 dark:border-white/10">Design</div>
          <div className="p-2 border-r border-b border-black/5 dark:border-white/10 text-center text-green-500">Done</div>
          <div className="p-2 border-b border-black/5 dark:border-white/10 text-right opacity-70 bg-indigo-50/20 dark:bg-indigo-500/5">06-10</div>
        </div>
        <div className="grid grid-cols-3 text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
          <div className="p-2 border-r border-black/5 dark:border-white/10">Build</div>
          <div className="p-2 border-r border-black/5 dark:border-white/10 text-center text-amber-500">WIP</div>
          <div className="p-2 border-black/5 dark:border-white/10 text-right opacity-70 bg-indigo-50/20 dark:bg-indigo-500/5">06-15</div>
        </div>
      </div>
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 opacity-60">Table Editor</span>
    </div>
  </div>
);

const AgentContextGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative select-none">
    <div className="font-mono text-[11px] leading-relaxed text-left w-full max-w-[280px] space-y-1">
      <div className="text-neutral-400 dark:text-neutral-500">---</div>
      <div className="flex items-center gap-1.5">
        <span className="text-sky-500 dark:text-sky-400">id:</span>
        <span className="opacity-60">ops-log-june</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sky-500 dark:text-sky-400">status:</span>
        <span className="opacity-60">active</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sky-500 dark:text-sky-400">version:</span>
        <span className="opacity-60">1.0.0</span>
      </div>
      <div className="flex items-start gap-1.5">
        <span className="text-sky-500 dark:text-sky-400 shrink-0">tags:</span>
        <span className="opacity-60">[trading, alpha-prod]</span>
      </div>
      <div className="text-neutral-400 dark:text-neutral-500">---</div>

      <div className="h-px bg-neutral-200 dark:bg-neutral-700 opacity-40 my-2" />

      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-500">#trading</span>
        <span className="opacity-40">from frontmatter</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">#active</span>
        <span className="opacity-40">lifecycle tag</span>
      </div>

      <div className="h-px bg-neutral-200 dark:bg-neutral-700 opacity-40 my-2" />

      <div className="text-[9px] uppercase tracking-widest opacity-30 font-bold">grep &quot;^status:&quot; *.md</div>
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest text-sky-500 opacity-60">Agent Context</span>
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
        { label: "Frontmatter",     pct: 100, pts: "40/40", color: "bg-emerald-500" },
        { label: "Heading structure",pct: 100, pts: "30/30", color: "bg-emerald-500" },
        { label: "Typed fences",    pct: 100, pts: "10/10", color: "bg-emerald-500" },
        { label: "Tables",          pct: 100, pts:  "5/5",  color: "bg-emerald-500" },
        { label: "Bold anchors",    pct:  60, pts:   "3/5", color: "bg-amber-400"   },
      ].map(({ label, pct, pts, color }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[9px] font-mono opacity-50 w-[88px] shrink-0">{label}</span>
          <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[9px] font-mono opacity-30 w-8 text-right shrink-0">{pts}</span>
        </div>
      ))}
    </div>

    {/* Mock status bar — matches real StatusBar */}
    <div
      className="border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-3xl flex items-center justify-between px-3 shrink-0"
      style={{ height: "22px" }}
    >
      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ Saved</span>
      <span className="flex-1 flex justify-center text-[11px] text-zinc-500 dark:text-zinc-400">
        <strong className="font-medium text-zinc-800 dark:text-zinc-200">~340</strong>&nbsp;tokens
      </span>
      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pl-2">
        AI: Structured
      </span>
    </div>
  </div>
);

const DEFAULT_DEMO_CONTENT = `---
id: ops-log-june
title: Daily Operations Log
status: active
version: 1.0.0
tags: [trading, alpha-prod]
dependencies: []
---

# Daily Operations Log

## Tasks

- Fix auth token refresh  #review
- Redesign API layer  #draft
- Migrate vault to new schema  #active

## Budget

+ 1,250.00
- 450.00
+ 85.50

Total: $885.50

Sprint ends [[2026-06-14]]`;

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

  const hasContent = realContent && realContent.length > 0 && realContent !== DEFAULT_DEMO_CONTENT;

  return (
    <main className="min-h-screen selection:bg-blue-500/30 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-[#050505] overflow-x-hidden font-sans">
      <LoadingOverlay isVisible={showLoading} text="Opening editor..." />

      {/* PERSISTENT RESUME NOTIFICATION */}
      {isMounted && hasContent && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-md">
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 animate-hero-fade-in">
            <div className="space-y-0.5 text-left">
              <p className="text-ui-footnote font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
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
            <h1 className="text-4xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              Your Vault, Your Agents,{" "}
              <span className="text-neutral-400 dark:text-neutral-600 italic font-serif">
                Your Machine.
              </span>
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              A local-first Markdown workspace built for engineers and AI practitioners. Structure your notes so both humans and background agents can read them — no cloud, no compromises.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="hero"
                onClick={handleStart}
                className="w-full sm:w-auto px-10"
              >
                Open Full Editor
              </Button>
              <div className="text-ui-footnote uppercase tracking-widest opacity-40 font-bold hidden sm:block">
                Free & Open Source
              </div>
            </div>
          </div>

          {/* INTERACTIVE EDITOR PREVIEW */}
          <div className="w-full max-w-4xl relative group animate-hero-fade-in [animation-fill-mode:forwards] [animation-delay:300ms] opacity-0">
             <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden ring-1 ring-black/5 dark:ring-white/5 transition-all duration-500 group-hover:shadow-blue-500/5 group-hover:ring-blue-500/20">
                <div className="h-10 bg-neutral-50 dark:bg-neutral-800/50 border-b border-black/5 dark:border-white/10 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/20 border border-red-400/30" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/20 border border-amber-400/30" />
                    <div className="w-3 h-3 rounded-full bg-green-400/20 border border-green-400/30" />
                  </div>
                  <div className="flex-1 text-ui-footnote font-mono opacity-30 text-center pr-10 overflow-hidden text-ellipsis whitespace-nowrap">
                    landing_demo.md — hermes_vault
                  </div>
                </div>
                <div className="h-[400px] md:h-[500px] text-left">
                  {isMounted && (
                    <Suspense fallback={<div className="h-full bg-neutral-50 dark:bg-neutral-900/50 animate-pulse" />}>
                      <MarkdownEditor
                        value={demoContent}
                        onChange={setDemoContent}
                      />
                    </Suspense>
                  )}
                </div>
             </div>
             <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </div>
        </div>
      </div>

      {/* --- TRUST SIGNALS --- */}
      <section className="py-12 border-y border-black/5 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/30 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center md:justify-between gap-8 opacity-40 grayscale">
          <div className="text-ui-footnote font-bold uppercase tracking-[0.3em] whitespace-nowrap">Agent-Ready Frontmatter</div>
          <div className="text-ui-footnote font-bold uppercase tracking-[0.3em] whitespace-nowrap">Live AI Readability Score</div>
          <div className="text-ui-footnote font-bold uppercase tracking-[0.3em] whitespace-nowrap">Local-First Vault</div>
          <div className="text-ui-footnote font-bold uppercase tracking-[0.3em] whitespace-nowrap">Zero Cloud</div>
        </div>
      </section>

      {/* --- FEATURES --- */}
      <div className="max-w-5xl mx-auto px-6 py-24 md:py-32 space-y-32">

        {/* 1. Agent-Readable Context — core mission, first */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-sky-500" />
            <h2 className="text-3xl font-bold tracking-tight">Agent-Readable Context</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Every file exposes a strict frontmatter schema — <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">id</code>, <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">title</code>, <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">status</code>, <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">version</code>, <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">tags</code> — so background scripts and LLMs can classify any file instantly with a single <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">grep</code>. Two inline lifecycles keep your work moving: document state (<code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">#draft</code> → <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">#active</code> → <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">#archived</code>) and task state (<code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">#todo</code> → <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">#prog</code> → <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">#done</code>). Place your cursor on any tag and use the ‹ › arrows to step through states.
            </p>
          </div>
          <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <AgentContextGraphic />
          </div>
        </section>

        {/* 2. AI Readability Score — key differentiator */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-last md:order-first aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <AgentScoreGraphic />
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-emerald-600" />
            <h2 className="text-3xl font-bold tracking-tight">Agent Readability Score</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              The status bar shows a live AI readability score — <em>Structured</em>, <em>Good</em>, <em>Fair</em>, or <em>Weak</em> — scored across frontmatter completeness, heading continuity, typed code fences, tables, and consistent list syntax. Hover to see exactly which fields are missing, in priority order. Fix the tips once and every agent that reads your vault benefits permanently.
            </p>
          </div>
        </section>

        {/* 3. Vault Management */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-blue-600" />
            <h2 className="text-3xl font-bold tracking-tight">Vault Management</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Open any local directory as a writing vault and save directly to your machine via the File System Access API — no upload required. All files live flat in your vault root. Smart Workspaces filter them in real time by tag, filename, date, or word count, with a built-in <em>Today's Work</em> view for files edited in the last 24 hours.
            </p>
          </div>
          <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <FilesystemGraphic />
          </div>
        </section>

        {/* 4. Writing Experience */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-last md:order-first aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <ZenModeGraphic />
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-purple-600" />
            <h2 className="text-3xl font-bold tracking-tight">Writing Experience</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Toggle Zen Mode (<code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">Ctrl+Shift+Z</code>) to collapse every panel and focus on a single line. Split the workspace into side-by-side panes and drag tabs between them. Elements in the editor are live — click <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">[ ]</code> to toggle tasks, click any date to open a calendar picker, and <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">Ctrl+Click</code> any WikiLink to navigate instantly.
            </p>
          </div>
        </section>

        {/* 5. Syntax & Shortcuts */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-amber-500" />
            <h2 className="text-3xl font-bold tracking-tight">Syntax & Shortcuts</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Type <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">/</code> to open the slash command menu — fuzzy-filter templates including Daily Note, Meeting Notes, and ready-made <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">/agent</code> context blocks. Shortcodes expand inline: <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">..d</code> for today's date, <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">calc()</code> for expressions, and a <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">Total:</code> line that auto-sums every currency value above it.
            </p>
          </div>
          <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <SmartSyntaxGraphic />
          </div>
        </section>

        {/* 6. Table Editor */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-last md:order-first aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <TableGraphic />
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-indigo-500" />
            <h2 className="text-3xl font-bold tracking-tight">Table Editor</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Place your cursor inside any pipe table to reveal a floating toolbar for instant structural edits — add rows, add columns, export as CSV. Open the Advanced Table Dialog for smart sorting with type detection across dates, currency, and numbers, and auto-padded alignment that keeps the raw Markdown clean under the hood. Insert a starter 3×2 grid with <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">/table</code> or the <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">{"{table}"}</code> shortcode.
            </p>
          </div>
        </section>

      </div>

      {/* --- CALL TO ACTION --- */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100 p-12 md:p-24 rounded-[3rem] shadow-sm border border-black/5 dark:border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 blur-[100px] -ml-32 -mb-32" />

          <h2 className="text-4xl md:text-6xl font-bold tracking-tight relative z-10">Own your context. Own your output.</h2>
          <p className="opacity-60 max-w-xl mx-auto text-lg relative z-10 font-medium">
            A workspace built for the era where the files you write are also the files your agents read.
          </p>
          <div className="pt-6 relative z-10 flex justify-center">
             <Button
               variant="hero"
               onClick={handleStart}
               className="shadow-xl hover:shadow-blue-500/20 transition-all"
             >
                Launch Workspace
             </Button>
          </div>
        </div>
      </section>

    </main>
  );
}
