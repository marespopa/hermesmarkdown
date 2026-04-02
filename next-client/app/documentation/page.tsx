"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function Documentation() {
  const router = useRouter();

  const sectionHeading =
    "text-xs uppercase tracking-[0.2em] opacity-50 mb-8 block";
  const guideRow =
    "flex justify-between border-b border-black/5 dark:border-white/5 py-4 last:border-none items-center";
  const syntaxLabel = "font-mono text-blue-600 dark:text-blue-400";
  const resultLabel = "opacity-40 italic text-right text-xs";

  return (
    <main className="min-h-screen font-mono selection:bg-blue-500 dark:selection:bg-blue-100 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-32 space-y-32">
        {/* --- HEADER --- */}
        <section className="space-y-8">
          <button
            onClick={() => router.back()}
            className="text-[10px] uppercase tracking-[0.3em] opacity-50 hover:opacity-100 transition-opacity"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-normal tracking-tighter italic">
            Documentation
          </h1>
          <p className="text-xl leading-relaxed text-zinc-800 dark:text-zinc-200">
            Hermes is a local-first environment built for focused writing. No
            cloud synchronization. No tracking. Just the interface between your
            mind and the page.
          </p>
        </section>

        {/* --- 01. INTERACTION LOGIC --- */}
        <section className="border-t border-black/10 dark:border-white/10 pt-12">
          <span className={sectionHeading}>01. Interaction Logic</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Desktop Commands
              </h3>
              <p className="text-sm leading-relaxed opacity-80">
                Interactive elements respond to clicks while the editor handles
                the syntax automatically.
              </p>
              <div className="text-sm space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-black/5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[10px] uppercase opacity-40">
                    Action
                  </span>
                  <span className="font-bold text-[10px] uppercase opacity-40">
                    Effect
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t border-black/5">
                  <span>Click Checkbox</span>
                  <span className="opacity-60 text-xs">Toggle [x]</span>
                </div>
                <div className="flex justify-between py-2 border-t border-black/5">
                  <span>Click Tag</span>
                  <span className="opacity-60 text-xs text-right">
                    Cycle Status Flow
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Mobile Behavior
              </h3>
              <p className="text-sm leading-relaxed opacity-80">
                Automatic toggles are disabled to prevent keyboard interference
                and accidental shifts.
              </p>
              <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/20 text-[10px] leading-relaxed uppercase tracking-wider text-amber-700 dark:text-amber-200/60">
                Note: Checkboxes and tags remain plain text for manual editing
                on mobile devices.
              </div>
            </div>
          </div>
        </section>

        {/* --- 02. SYNTAX & WORKFLOW --- */}
        <section className="border-t border-black/10 dark:border-white/10 pt-12">
          <span className={sectionHeading}>02. Syntax Guide</span>

          <div className="space-y-16">
            {/* Workflow Lifecycle */}
            <div>
              <h3 className="text-xs font-bold mb-6 opacity-30 uppercase tracking-widest">
                Status Lifecycle
              </h3>
              <div className="flex items-center justify-between px-2 opacity-80">
                {["#urgn", "#todo", "#prog", "#wait", "#done"].map(
                  (tag, i, arr) => (
                    <React.Fragment key={tag}>
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                        {tag}
                      </span>
                      {i < arr.length - 1 && (
                        <span className="opacity-20">→</span>
                      )}
                    </React.Fragment>
                  ),
                )}
              </div>
              <p className="mt-4 text-[10px] opacity-40 italic">
                Clicking any status tag cycles to the next state in the
                sequence.
              </p>
            </div>

            {/* Core Syntax Table */}
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-bold opacity-30 uppercase tracking-widest">
                  Standard Markdown
                </h3>
                <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 border border-black/5 dark:border-white/5 font-mono text-sm">
                  <div className={guideRow}>
                    <span className={syntaxLabel}>- [ ]</span>
                    <span className={resultLabel}>Task List Item</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}># H1</span>
                    <span className={resultLabel}>Heading 1</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>&gt; Text</span>
                    <span className={resultLabel}>Blockquote</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>`Code`</span>
                    <span className={resultLabel}>Inline Style</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold opacity-30 uppercase tracking-widest">
                  Shortcuts
                </h3>
                <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 border border-black/5 dark:border-white/5 font-mono text-sm">
                  <div className={guideRow}>
                    <span className={syntaxLabel}>..d</span>
                    <span className={resultLabel}>Expands to YYYY-MM-DD</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{time}"}</span>
                    <span className={resultLabel}>Expands to HH:mm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Code Block Example */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold opacity-30 uppercase tracking-widest">
                Blocks
              </h3>
              <div className="bg-zinc-50 dark:bg-zinc-900/30 p-6 border border-black/5 dark:border-white/5">
                <div className="flex justify-between mb-4 border-b border-black/5 pb-2">
                  <span className="text-[10px] uppercase opacity-40 tracking-widest">
                    Input
                  </span>
                  <span className="text-[10px] uppercase opacity-40 tracking-widest text-right">
                    Rendering
                  </span>
                </div>
                <code className="block text-blue-600 dark:text-blue-400 whitespace-pre overflow-x-auto text-xs leading-relaxed">
                  {"```javascript\nconst focus = true;\n```"}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="pt-20 pb-12 text-center border-t border-black/5 dark:border-white/5">
          <p className="text-[10px] uppercase tracking-[0.4em] opacity-30 italic">
            Focus First — Markdown Only
          </p>
        </footer>
      </div>
    </main>
  );
}
