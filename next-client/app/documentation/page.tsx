"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function Documentation() {
  const router = useRouter();

  const sectionHeading =
    "text-xs uppercase tracking-[0.2em] opacity-50 mb-8 block";
  const guideRow =
    "flex justify-between border-b border-black/5 dark:border-white/5 py-4 last:border-none";
  const syntaxLabel = "font-mono text-blue-600 dark:text-blue-400";
  const resultLabel = "opacity-40 italic text-right text-xs";

  return (
    <main className="min-h-screen font-mono selection:bg-blue-500 dark:selection:bg-blue-100 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-32 space-y-32">
        {/* --- HEADER SECTION --- */}
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

        {/* --- 01. INTERACTION LOGIC (REFINED) --- */}
        <section className="border-t border-black/10 dark:border-white/10 pt-12">
          <span className={sectionHeading}>01. Interaction Logic</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Desktop Commands
              </h3>
              <p className="text-sm leading-relaxed opacity-80">
                On desktop, interactive elements require a modifier to prevent
                accidental triggers while typing:
              </p>
              <ul className="text-sm space-y-3 opacity-80">
                <li className="flex gap-3">
                  <span className="font-bold text-zinc-500 min-w-[80px]">
                    CTRL+Click
                  </span>
                  <span>
                    Toggle checkboxes, cycle status tags, or open external
                    links.
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Mobile Behavior
              </h3>
              <p className="text-sm leading-relaxed opacity-80">
                Mobile devices prioritize standard text entry. To ensure
                stability, automatic toggles are disabled.
              </p>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-black/5 text-[10px] uppercase tracking-wider opacity-60">
                Note: Checkboxes and tags remain plain text for manual editing
                on mobile.
              </div>
            </div>
          </div>
        </section>

        {/* --- 02. FULL MARKDOWN GUIDE --- */}
        <section className="border-t border-black/10 dark:border-white/10 pt-12">
          <span className={sectionHeading}>02. Syntax Guide</span>

          <div className="space-y-12">
            {/* Structure */}
            <div>
              <h3 className="text-xs font-bold mb-4 opacity-30 uppercase tracking-widest">
                Structure
              </h3>
              <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 border border-black/5 dark:border-white/5 font-mono text-sm">
                <div className={guideRow}>
                  <span className={syntaxLabel}># H1</span>
                  <span className={resultLabel}>Heading 1</span>
                </div>
                <div className={guideRow}>
                  <span className={syntaxLabel}>## H2</span>
                  <span className={resultLabel}>Heading 2</span>
                </div>
                <div className={guideRow}>
                  <span className={syntaxLabel}>---</span>
                  <span className={resultLabel}>Horizontal Rule</span>
                </div>
                <div className={guideRow}>
                  <span className={syntaxLabel}>&gt; Text</span>
                  <span className={resultLabel}>Blockquote</span>
                </div>
              </div>
            </div>

            {/* Workflow & Tasks */}
            <div>
              <h3 className="text-xs font-bold mb-4 opacity-30 uppercase tracking-widest">
                Workflow & Tasks
              </h3>
              <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 border border-black/5 dark:border-white/5 font-mono text-sm">
                <div className={guideRow}>
                  <span className={syntaxLabel}>- [ ] Task</span>
                  <span className={resultLabel}>
                    CTRL + Click box to toggle
                  </span>
                </div>
                <div className={guideRow}>
                  <span className={syntaxLabel}>#todo</span>
                  <span className={resultLabel}>
                    Cycles: urgn → todo → prog → wait → done
                  </span>
                </div>
                <div className={guideRow}>
                  <span className={syntaxLabel}>[Text](url)</span>
                  <span className={resultLabel}>CTRL + Click to Open Link</span>
                </div>
              </div>
            </div>

            {/* Emphasis */}
            <div>
              <h3 className="text-xs font-bold mb-4 opacity-30 uppercase tracking-widest">
                Emphasis
              </h3>
              <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 border border-black/5 dark:border-white/5 font-mono text-sm">
                <div className={guideRow}>
                  <span className={syntaxLabel}>**Bold**</span>
                  <span className={resultLabel}>Strong</span>
                </div>
                <div className={guideRow}>
                  <span className={syntaxLabel}>_Italic_</span>
                  <span className={resultLabel}>Emphasis</span>
                </div>
                <div className={guideRow}>
                  <span className={syntaxLabel}>~~Strike~~</span>
                  <span className={resultLabel}>Strikethrough</span>
                </div>
                <div className={guideRow}>
                  <span className={syntaxLabel}>`Code`</span>
                  <span className={resultLabel}>Inline Code</span>
                </div>
              </div>
            </div>

            {/* Advanced */}
            <div>
              <h3 className="text-xs font-bold mb-4 opacity-30 uppercase tracking-widest">
                Advanced
              </h3>
              <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 border border-black/5 dark:border-white/5 font-mono text-sm leading-relaxed py-6">
                <div className="space-y-2 mb-8">
                  <p className="opacity-40 italic">Shortcodes:</p>
                  <div className="flex justify-between border-b border-black/5 py-1">
                    <span className={syntaxLabel}>..d</span>
                    <span className={resultLabel}>
                      Current Date (YYYY-MM-DD)
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-black/5 py-1">
                    <span className={syntaxLabel}>{`{date}`}</span>
                    <span className={resultLabel}>
                      Current Date (YYYY-MM-DD)
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-black/5 py-1">
                    <span className={syntaxLabel}>{"{time}"}</span>
                    <span className={resultLabel}>Current Time (HH:mm)</span>
                  </div>
                </div>

                <p className="opacity-40 mb-4 italic">Code Blocks:</p>
                <code className="block text-blue-600 dark:text-blue-400 whitespace-pre overflow-x-auto pb-2">
                  {"```javascript\nconst focus = true;\n```"}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="pt-20 pb-12 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] opacity-30 italic">
            Focus First — Markdown Only
          </p>
        </footer>
      </div>
    </main>
  );
}
