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

const FilesystemGraphic = () => {
  const year = new Date().getFullYear();
  return (
  <div className="w-full h-full flex items-center justify-center p-6 relative">
    <div className="font-mono text-[11px] leading-relaxed text-left select-none w-full max-w-[260px]">
      <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 font-semibold mb-1">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        hermes_vault/
      </div>
      <div className="border-l border-neutral-300 dark:border-neutral-700 ml-[6px] pl-3 space-y-1">
        <div className="flex items-center gap-1.5 opacity-60">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          daily-notes.md
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          project-ideas.md
        </div>
        <div className="flex items-center gap-1.5 text-blue-400 dark:text-blue-500 opacity-80">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          journal/
        </div>
        <div className="border-l border-neutral-300 dark:border-neutral-700 ml-[6px] pl-3 space-y-1">
          <div className="flex items-center gap-1.5 opacity-40">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            {year}-01.md
          </div>
          <div className="flex items-center gap-1.5 opacity-40">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            {year}-02.md
          </div>
        </div>
      </div>
    </div>
    <div className="absolute top-4 right-4 flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      <span className="text-[9px] font-mono uppercase tracking-widest text-blue-500 dark:text-blue-400 opacity-70">Connected</span>
    </div>
  </div>
  );
};

const ZenModeGraphic = () => {
  return (
    <div className="w-full h-full flex items-center justify-center p-8 relative overflow-hidden group/zen">
      {/* Background with subtle depth */}
      <div className="absolute inset-0 bg-neutral-50/50 dark:bg-black/20 -z-10" />
      
      {/* Central Canvas Area */}
      <div className="w-full max-w-[280px]">
        <svg width="100%" height="120" viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
          {/* Top lines (Faded context) */}
          <rect x="0" y="0" width="160" height="4" rx="2" className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity" />
          <rect x="0" y="16" width="220" height="4" rx="2" className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity" />
          <rect x="0" y="32" width="190" height="4" rx="2" className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity" />
          
          {/* Focused line (High Contrast Purple) */}
          <g>
             <rect x="0" y="56" width="250" height="6" rx="3" className="fill-purple-600 dark:fill-purple-400" />
             {/* Glow effect for focused line */}
             <rect x="0" y="56" width="250" height="6" rx="3" className="fill-purple-500 dark:fill-purple-400 blur-[8px] opacity-40" />
          </g>

          {/* Bottom lines (Faded context) */}
          <rect x="0" y="84" width="200" height="4" rx="2" className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity" />
          <rect x="0" y="100" width="140" height="4" rx="2" className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity" />
          <rect x="0" y="116" width="170" height="4" rx="2" className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity" />
        </svg>
      </div>

      {/* Atmospheric Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-500/10 dark:bg-purple-500/20 blur-[60px] pointer-events-none" />

      <div className="absolute top-4 right-4">
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 font-bold opacity-80">Zen Mode</span>
      </div>
    </div>
  );
};

const PrivacyGraphic = () => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-5 relative select-none">
    <div className="relative">
      <svg width="72" height="56" viewBox="0 0 72 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70 dark:opacity-60">
        <rect x="2" y="2" width="68" height="42" rx="4" className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="2" />
        <line x1="2" y1="44" x2="70" y2="44" className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="2" />
        <line x1="28" y1="44" x2="28" y2="54" className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="2" />
        <line x1="44" y1="44" x2="44" y2="54" className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="2" />
        <line x1="20" y1="54" x2="52" y2="54" className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="2" strokeLinecap="round" />
        <circle cx="36" cy="23" r="3" className="fill-neutral-300 dark:fill-neutral-600" />
      </svg>
      <div className="absolute -bottom-2 -right-3">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 6v6c0 5.5 3.4 10.7 8 12 4.6-1.3 8-6.5 8-12V6L12 2z" className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="1.5" />
          <path d="M9 12l2 2 4-4" className="stroke-emerald-500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <div className="relative opacity-25">
          <svg width="22" height="16" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-neutral-500 dark:stroke-neutral-400" strokeWidth="1.5" strokeLinecap="round">
            <path d="M18 10h1a4 4 0 0 0 0-8h-.5A6 6 0 1 0 6 8.5" />
            <path d="M6 10H5a3 3 0 0 0 0 6h13a3 3 0 0 0 .9-.1" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[26px] h-0.5 bg-neutral-500 dark:bg-neutral-400 rotate-45 rounded-full" />
          </div>
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-ping"
          style={{
            top: `${[10, 30, 55][i]}%`,
            left: `${[10, 80, 45][i]}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: "2s",
          }}
        />
      ))}
    </div>
    <div className="text-[9px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 opacity-60">
      · No Cloud · No Servers · No Tracking ·
    </div>
  </div>
);

const SmartSyntaxGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative select-none">
    <div className="font-mono text-[11px] leading-loose text-left w-full max-w-[280px] space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-red-500/15 text-red-500">#urgn</span>
        <span className="opacity-50">Fix auth token refresh</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500">#prog</span>
        <span className="opacity-50">Redesign landing page</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-green-500/15 text-green-500">#done</span>
        <span className="opacity-50">Update README</span>
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

const DEFAULT_DEMO_CONTENT = `# Welcome to HermesMarkdown

A premium, local-first workspace for your thoughts.

- **Local-First**: No servers, no lag.
- **Privacy-Centric**: Your data stays on your machine.
- **Deep Work**: Distraction-free by design.

Type anything here to start your draft...`;

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
    <main className="min-h-screen selection:bg-blue-500/30 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-950 overflow-x-hidden font-sans">
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
              Your Mind, Your Markdown,{" "}
              <span className="text-neutral-400 dark:text-neutral-600 italic font-serif">
                Your Machine.
              </span>
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              A minimalist, local-first workspace for deep work. Own your thoughts with a distraction-free environment that lives entirely on your device.
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
             {/* Mock Window Frame */}
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
             
             {/* Visual Polish: Glow */}
             <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </div>
        </div>
      </div>

      {/* --- TRUST SIGNALS --- */}
      <section className="py-12 border-y border-black/5 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/30 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center md:justify-between gap-8 opacity-40 grayscale">
          <div className="text-ui-footnote font-bold uppercase tracking-[0.3em] whitespace-nowrap">Built for Developers</div>
          <div className="text-ui-footnote font-bold uppercase tracking-[0.3em] whitespace-nowrap">Privacy First</div>
          <div className="text-ui-footnote font-bold uppercase tracking-[0.3em] whitespace-nowrap">No Cloud Required</div>
          <div className="text-ui-footnote font-bold uppercase tracking-[0.3em] whitespace-nowrap">Local-First Sync</div>
        </div>
      </section>

      {/* --- FEATURES --- */}
      <div className="max-w-5xl mx-auto px-6 py-24 md:py-32 space-y-32">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-blue-600" />
            <h2 className="text-3xl font-bold tracking-tight">Knowledge Management</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Open any local directory to treat it as a writing vault. Browse files, manage folders, and save changes directly to your machine using modern web standards.
            </p>
          </div>
          <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <FilesystemGraphic />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-last md:order-first aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <ZenModeGraphic />
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-purple-600" />
            <h2 className="text-3xl font-bold tracking-tight">Writing Experience</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              No distractions, just your thoughts. Toggle Zen Mode to focus on a single line, or use our split-pane workspace to build complex knowledge webs without leaving the keyboard.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-amber-500" />
            <h2 className="text-3xl font-bold tracking-tight">Syntax & Shortcuts</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Beyond what any text editor offers. Cycle workflow statuses with clickable <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">#tags</code>, auto-sum budgets with a <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">Total:</code> line, evaluate expressions inline with <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">calc()</code>, and insert or edit any date with a single shortcode or click.
            </p>
          </div>
          <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <SmartSyntaxGraphic />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-last md:order-first aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <PrivacyGraphic />
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-emerald-600" />
            <h2 className="text-3xl font-bold tracking-tight">True Content Privacy</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Your writing belongs to you. No central database, no proprietary formats, and no "AI training" on your private notes. Everything is stored in human-readable Markdown on your own machine.
            </p>
          </div>
        </section>
      </div>

      {/* --- CALL TO ACTION --- */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100 p-12 md:p-24 rounded-[3rem] shadow-sm border border-black/5 dark:border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 blur-[100px] -ml-32 -mb-32" />
          
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight relative z-10">Ready to own your thoughts?</h2>
          <p className="opacity-60 max-w-xl mx-auto text-lg relative z-10 font-medium">
            Join writers and developers who have switched to a local-first workflow.
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
