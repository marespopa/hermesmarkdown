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
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Welcome Back
              </p>
              <p className="text-xs opacity-60">
                You have a draft waiting in your local vault.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleStart}
              className="h-9 px-4 !text-[11px]"
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
              <div className="text-[10px] uppercase tracking-widest opacity-40 font-bold hidden sm:block">
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
                  <div className="flex-1 text-[10px] font-mono opacity-30 text-center pr-10 overflow-hidden text-ellipsis whitespace-nowrap">
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
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] whitespace-nowrap">Built for Developers</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] whitespace-nowrap">Privacy First</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] whitespace-nowrap">No Cloud Required</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] whitespace-nowrap">Local-First Sync</div>
        </div>
      </section>

      {/* --- FEATURES --- */}
      <div className="max-w-5xl mx-auto px-6 py-24 md:py-32 space-y-32">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-blue-600" />
            <h2 className="text-3xl font-bold tracking-tight">Local-First Vaults</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Experience zero-latency writing. HermesMarkdown syncs directly with your local file system using modern Web API standards. Open any folder as a Vault and manage your Markdown library with full directory support.
            </p>
          </div>
          <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <span className="text-[10px] uppercase tracking-widest opacity-20 font-bold">Filesystem API Integration</span>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-last md:order-first aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <span className="text-[10px] uppercase tracking-widest opacity-20 font-bold">Zen Mode Workspace</span>
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-purple-600" />
            <h2 className="text-3xl font-bold tracking-tight">Designed for Deep Work</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              No distractions, just your thoughts. Toggle Zen Mode to focus on a single line, or use our split-pane workspace to build complex knowledge webs without leaving the keyboard.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-emerald-600" />
            <h2 className="text-3xl font-bold tracking-tight">True Content Privacy</h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Your writing belongs to you. No central database, no proprietary formats, and no "AI training" on your private notes. Everything is stored in human-readable Markdown on your own machine.
            </p>
          </div>
          <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <span className="text-[10px] uppercase tracking-widest opacity-20 font-bold">100% Client-Side</span>
          </div>
        </section>
      </div>

      {/* --- CALL TO ACTION --- */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8 bg-neutral-900 dark:bg-zinc-100 text-white dark:text-neutral-900 p-12 md:p-24 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[100px] -ml-32 -mb-32" />
          
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight relative z-10">Ready to own your thoughts?</h2>
          <p className="opacity-70 max-w-xl mx-auto text-lg relative z-10">
            Join writers and developers who have switched to a local-first workflow.
          </p>
          <div className="pt-6 relative z-10 flex justify-center">
             <Button 
               variant="hero" 
               onClick={handleStart}
               className="!bg-white !text-neutral-900 dark:!bg-neutral-900 dark:!text-white shadow-xl hover:shadow-2xl transition-all"
             >
                Launch Workspace
             </Button>
          </div>
        </div>
      </section>

    </main>
  );
}
