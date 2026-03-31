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
  const resultLabel = "opacity-40 italic text-right";

  return (
    <main className="min-h-screen font-mono selection:bg-blue-500 dark:selection:bg-blue-100 bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">
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

          <p className="text-xl leading-relaxed">
            Hermes is a local-first environment built for focused writing. No
            cloud synchronization. No tracking. Just the interface between your
            mind and the page.
          </p>
        </section>

        {/* --- PHILOSOPHY SECTION --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-black/10 dark:border-white/10 pt-12">
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.2em] opacity-50">
              01. Persistence
            </h2>
            <p className="text-sm leading-relaxed">
              Your drafts are stored in your browser&apos;s Local Storage.
              Always export to{" "}
              <code className="text-blue-600 dark:text-blue-400">.md</code> to
              ensure a permanent backup on your machine.
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.2em] opacity-50">
              02. Privacy
            </h2>
            <p className="text-sm leading-relaxed">
              Zero data leaves your device. Hermes operates entirely
              client-side, making it a safe haven for private thoughts and
              proprietary drafts.
            </p>
          </div>
        </section>

        {/* --- FULL MARKDOWN GUIDE --- */}
        <section className="border-t border-black/10 dark:border-white/10 pt-12">
          <span className={sectionHeading}>03. Syntax Guide</span>

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

            {/* Lists & Links */}
            <div>
              <h3 className="text-xs font-bold mb-4 opacity-30 uppercase tracking-widest">
                Lists & Links
              </h3>
              <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 border border-black/5 dark:border-white/5 font-mono text-sm">
                <div className={guideRow}>
                  <span className={syntaxLabel}>- Item</span>
                  <span className={resultLabel}>Unordered List</span>
                </div>
                <div className={guideRow}>
                  <span className={syntaxLabel}>1. Item</span>
                  <span className={resultLabel}>Ordered List</span>
                </div>
                <div className={guideRow}>
                  <span className={syntaxLabel}>- [ ] Task</span>
                  <span className={resultLabel}>Checklist</span>
                </div>
                <div className={guideRow}>
                  <span className={syntaxLabel}>[Text](url)</span>
                  <span className={resultLabel}>Hyperlink</span>
                </div>
              </div>
            </div>

            {/* Advanced */}
            <div>
              <h3 className="text-xs font-bold mb-4 opacity-30 uppercase tracking-widest">
                Advanced
              </h3>
              <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 border border-black/5 dark:border-white/5 font-mono text-sm leading-relaxed py-6">
                <p className="opacity-40 mb-4 italic">Code Blocks:</p>
                <code className="block text-blue-600 dark:text-blue-400 whitespace-pre">
                  {"```javascript\nconst focus = true;\n```"}
                </code>

                <p className="opacity-40 mt-8 mb-4 italic">Tables:</p>
                <code className="block text-blue-600 dark:text-blue-400 whitespace-pre">
                  {"| Header | Header |\n| :--- | :--- |\n| Cell | Cell |"}
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
