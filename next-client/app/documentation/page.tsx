"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";

export default function Documentation() {
  const router = useRouter();

  const sectionHeading = "text-ui-footnote uppercase tracking-[0.3em] font-bold text-blue-600 dark:text-blue-400 mb-8 block";
  const guideRow = "flex justify-between border-b border-black/5 dark:border-white/5 py-4 last:border-none items-center gap-4";
  const syntaxLabel = "font-mono text-blue-600 dark:text-blue-400 font-bold";
  const resultLabel = "opacity-40 italic text-right text-ui-footnote uppercase tracking-wider font-bold";

  return (
    <main className="min-h-screen selection:bg-blue-500/30 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-950 overflow-x-hidden font-sans">
      <div className="max-w-5xl mx-auto px-6 pt-32 pb-32 space-y-32">
        {/* --- HEADER --- */}
        <section className="space-y-8 animate-hero-fade-in">
          <Button
            variant="tertiary"
            onClick={() => router.back()}
            className="!text-ui-footnote uppercase tracking-[0.3em] opacity-40 hover:opacity-100 -ml-4"
          >
            ← Back
          </Button>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight leading-[1.1]">
            Product{" "}
            <span className="text-neutral-400 dark:text-neutral-600 italic font-serif">
              Documentation.
            </span>
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-3xl">
            HermesMarkdown is a professional, local-first workspace built for deep work. No cloud, no tracking, no friction—just a clean canvas for your thoughts.
          </p>
        </section>

        {/* --- 01. KNOWLEDGE MANAGEMENT --- */}
        <section className="border-t border-black/5 dark:border-white/10 pt-20">
          <span className={sectionHeading}>01. Knowledge Management</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Local-First Vaults
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Open any local directory to treat it as a writing vault. Browse files, manage folders, and save changes directly to your machine using modern web standards.
              </p>
              <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                <div className={guideRow}>
                  <span className="text-sm font-medium">Open Vault</span>
                  <span className={resultLabel}>Ribbon Icon</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">File Actions</span>
                  <span className={resultLabel}>Sidebar Explorer</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Rename/Delete</span>
                  <span className={resultLabel}>Context Menu</span>
                </div>
              </div>
              <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/20 rounded-xl text-ui-footnote leading-relaxed uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400/80">
                Note: Cloud storage sync (Dropbox, iCloud) may lock files. We recommend pausing sync during active writing sessions for the smoothest experience.
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Internal Connectivity
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Connect your ideas using WikiLink syntax and organize them with tags. HermesMarkdown automatically indexes your vault for dynamic navigation.
              </p>
              <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm space-y-4">
                <div className={guideRow}>
                  <span className="font-mono text-sm text-purple-600 dark:text-purple-400 font-bold">[[Note Name]]</span>
                  <span className={resultLabel}>Internal Link</span>
                </div>
                <div className={guideRow}>
                  <span className="font-mono text-sm text-blue-600 dark:text-blue-400 font-bold">#todo</span>
                  <span className={resultLabel}>Smart Filter</span>
                </div>
              </div>
              <p className="text-ui-footnote opacity-40 italic leading-relaxed font-bold uppercase tracking-widest">
                Navigation: CTRL + Click to open links. Click sidebar tags to filter your entire vault instantly.
              </p>
            </div>
          </div>
        </section>

        {/* --- 02. INTERACTIVE ENGINE --- */}
        <section className="border-t border-black/5 dark:border-white/10 pt-20">
          <span className={sectionHeading}>02. Interactive Engine</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Zen Mode
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Eliminate distractions and focus entirely on the active line. Zen Mode hides all sidebars and enables typewriter scrolling.
              </p>
              <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                <div className={guideRow}>
                  <span className="text-sm font-medium">Toggle Zen</span>
                  <span className={resultLabel}>CTRL+SHIFT+Z</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Typewriter Scroll</span>
                  <span className={resultLabel}>Always Centered</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Focus Highlight</span>
                  <span className={resultLabel}>Active Line Tint</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Click Actions
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Elements in the editor are live. Clicking them modifies the underlying text automatically without needing to type syntax.
              </p>
              <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                <div className={guideRow}>
                  <span className="text-sm font-medium">Toggle Task</span>
                  <span className={resultLabel}>Click `[ ]` or `[x]`</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Cycle Status</span>
                  <span className={resultLabel}>Click any `#tag`</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Navigate</span>
                  <span className={resultLabel}>CTRL + Click Link</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 03. SYNTAX & SHORTCUTS --- */}
        <section className="border-t border-black/5 dark:border-white/10 pt-20">
          <span className={sectionHeading}>03. Syntax & Shortcuts</span>

          <div className="space-y-16">
            {/* Workflow Lifecycle */}
            <div className="p-12 bg-neutral-900 dark:bg-zinc-100 text-white dark:text-neutral-900 rounded-[3rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32" />
              <h3 className="text-xs font-bold mb-10 opacity-40 uppercase tracking-[0.3em] text-center">
                Workflow Lifecycle
              </h3>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-8 max-w-2xl mx-auto">
                {["#urgn", "#todo", "#prog", "#done"].map((tag, i, arr) => (
                  <React.Fragment key={tag}>
                    <div className="flex flex-col items-center gap-2">
                       <span className="text-lg font-mono text-blue-400 dark:text-blue-600 font-bold">
                        {tag}
                      </span>
                      <span className="text-ui-footnote uppercase tracking-widest opacity-30 font-bold">{tag === '#urgn' ? 'Urgent' : tag === '#todo' ? 'To-Do' : tag === '#prog' ? 'Progress' : 'Done'}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <span className="opacity-20 hidden sm:block">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <p className="mt-12 text-center text-ui-footnote opacity-40 italic max-w-md mx-auto leading-relaxed">
                Status tags are interactive. Clicking a tag in the editor cycles it to the next phase in the lifecycle.
              </p>
            </div>

            {/* Syntax Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div className="space-y-6">
                <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.3em]">
                  Live Shortcodes
                </h3>
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm font-mono text-xs">
                  <div className={guideRow}>
                    <span className={syntaxLabel}>..d</span>
                    <span className={resultLabel}>Current Date</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{time}"}</span>
                    <span className={resultLabel}>Current Time</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{iso}"}</span>
                    <span className={resultLabel}>ISO Timestamp</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>..tomorrow</span>
                    <span className={resultLabel}>Tomorrow's Date</span>
                  </div>
                   <div className={guideRow}>
                    <span className={syntaxLabel}>{"{check}"}</span>
                    <span className={resultLabel}>✅ Emoji</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>/</span>
                    <span className={resultLabel}>Template Menu</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.3em]">
                  Financial Intelligence
                </h3>
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm space-y-6">
                   <div className="space-y-2">
                    <p className="text-ui-footnote leading-relaxed text-neutral-600 dark:text-neutral-400">
                      HermesMarkdown sums all currency values found above a line starting with <code className="font-bold text-blue-600">Total:</code>.
                    </p>
                    <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl font-mono text-ui-footnote">
                      <div className="opacity-40">- Rent: $2000</div>
                      <div className="opacity-40">- Food: $400</div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold mt-1 pt-1 border-t border-emerald-500/20">Total: $2400.00</div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-black/5">
                    <div className={guideRow}>
                      <span className={syntaxLabel}>calc(100+50)=</span>
                      <span className={resultLabel}>150</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="pt-20 pb-12 text-center border-t border-black/5 dark:border-white/5 opacity-30">
          <p className="text-ui-footnote uppercase tracking-[0.4em] font-bold">
            Stay Local — Write Deep
          </p>
        </footer>
      </div>
    </main>
  );
}
