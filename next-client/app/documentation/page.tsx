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
            cloud synchronization. No tracking. Just an interactive canvas
            designed for speed and status tracking.
          </p>
        </section>

        {/* --- 01. KNOWLEDGE MANAGEMENT --- */}
        <section className="border-t border-black/10 dark:border-white/10 pt-12">
          <span className={sectionHeading}>01. Knowledge Management</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                Local-First Vaults
              </h3>
              <p className="text-sm leading-relaxed opacity-80">
                Open any local directory to treat it as a writing vault. Browse files, 
                manage folders, and save changes directly to your machine.
              </p>
              <div className="text-sm p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-black/5">
                <div className={guideRow}>
                  <span>Open Vault</span>
                  <span className={resultLabel}>Click "Vault" Button</span>
                </div>
                <div className={guideRow}>
                  <span>File Actions</span>
                  <span className={resultLabel}>Hover + Menu in Sidebar</span>
                </div>
                <div className={guideRow}>
                  <span>Rename/Delete</span>
                  <span className={resultLabel}>Vault File Management</span>
                </div>
                <div className={guideRow}>
                  <span>Exit Vault</span>
                  <span className={resultLabel}>Return to Lite Mode</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                Internal Connectivity
              </h3>
              <p className="text-sm leading-relaxed opacity-80">
                Connect your ideas using WikiLink syntax and organize them with tags. 
                Hermes automatically indexes your vault for dynamic navigation.
              </p>
              <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 border border-black/5 font-mono text-sm">
                <div className={guideRow}>
                  <span className="font-mono text-purple-600 dark:text-purple-400">[[Note Name]]</span>
                  <span className={resultLabel}>Internal Link</span>
                </div>
                <div className={guideRow}>
                  <span className="font-mono text-blue-600 dark:text-blue-400">#todo</span>
                  <span className={resultLabel}>Smart Filter</span>
                </div>
              </div>
              <p className="text-[10px] opacity-40 italic leading-relaxed">
                Navigation: CTRL + Click [[WikiLink]] to open. Click any tag in the "Smart Filters" 
                sidebar section to view all notes containing that tag.
              </p>
            </div>
          </div>
        </section>

        {/* --- 02. INTERACTIVE ENGINE --- */}
        <section className="border-t border-black/10 dark:border-white/10 pt-12">
          <span className={sectionHeading}>02. Interactive Engine</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Click Actions
              </h3>
              <p className="text-sm leading-relaxed opacity-80">
                Elements in the editor are live. Clicking them modifies the
                underlying text automatically.
              </p>
              <div className="text-sm p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-black/5">
                <div className={guideRow}>
                  <span>Toggle Task</span>
                  <span className={resultLabel}>
                    Click `[ ]` or `[x]`
                  </span>
                </div>
                <div className={guideRow}>
                  <span>Cycle Status</span>
                  <span className={resultLabel}>Click any `#tag`</span>
                </div>
                <div className={guideRow}>
                  <span>Navigate</span>
                  <span className={resultLabel}>CTRL + Click Link</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Smart Handling
              </h3>
              <p className="text-sm leading-relaxed opacity-80">
                The editor intercepts specific inputs to format your workflow
                without breaking your concentration.
              </p>
              <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/20 text-[10px] leading-relaxed uppercase tracking-wider text-blue-700 dark:text-blue-200/60">
                Tip: Pasting a URL automatically generates a `[link](url)` and
                selects the label for immediate renaming.
              </div>
            </div>
          </div>
        </section>

        {/* --- 03. WORKSPACES & FILTERS --- */}
        <section className="border-t border-black/10 dark:border-white/10 pt-12">
          <span className={sectionHeading}>03. Workspaces & Filters</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
                Workspaces
              </h3>
              <p className="text-sm leading-relaxed opacity-80">
                Workspaces are predefined smart folders that automatically group your files based on metadata, helping you focus on what matters now without manual organization.
              </p>
              <div className="text-sm p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-black/5">
                <div className={guideRow}>
                  <span>Today's Work</span>
                  <span className={resultLabel}>Recently modified files</span>
                </div>
                <div className={guideRow}>
                  <span>Review Pending</span>
                  <span className={resultLabel}>Files with <code className="font-mono text-blue-600 dark:text-blue-400">#todo</code> or <code className="font-mono text-blue-600 dark:text-blue-400">#review</code></span>
                </div>
                <div className={guideRow}>
                  <span>Stale Logs</span>
                  <span className={resultLabel}>Older, inactive documents</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
                Smart Filters
              </h3>
              <p className="text-sm leading-relaxed opacity-80">
                Hermes automatically indexes any <code className="font-mono text-blue-600 dark:text-blue-400">#tag</code> used in your documents. These appear dynamically in the sidebar under Smart Filters.
              </p>
              <div className="p-4 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200/20 text-[10px] leading-relaxed uppercase tracking-wider text-orange-700 dark:text-orange-200/60">
                Tip: Click any tag in the sidebar to instantly filter your vault and view all notes containing that specific tag.
              </div>
            </div>
          </div>
        </section>

        {/* --- 04. SYNTAX & SHORTCUTS --- */}
        <section className="border-t border-black/10 dark:border-white/10 pt-12">
          <span className={sectionHeading}>04. Syntax Guide</span>

          <div className="space-y-16">
            {/* Workflow Lifecycle */}
            <div>
              <h3 className="text-xs font-bold mb-6 opacity-30 uppercase tracking-widest">
                Workflow Lifecycle
              </h3>
              <div className="flex items-center justify-between px-2 opacity-80">
                {["#urgn", "#todo", "#prog", "#done"].map((tag, i, arr) => (
                  <React.Fragment key={tag}>
                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                      {tag}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="opacity-20">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <p className="mt-4 text-[10px] opacity-40 italic">
                Status tags are interactive. Clicking `#todo` transforms it to
                `#prog`, and eventually `#done`.
              </p>
            </div>

            {/* Core Syntax Table */}
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-bold opacity-30 uppercase tracking-widest">
                  Task Syntax
                </h3>
                <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 border border-black/5 dark:border-white/5 font-mono text-sm">
                  <div className={guideRow}>
                    <span className={syntaxLabel}>- [ ]</span>
                    <span className={resultLabel}>Empty Checkbox</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>- [x]</span>
                    <span className={resultLabel}>Completed (Fades out)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold opacity-30 uppercase tracking-widest">
                  Live Shortcodes
                </h3>
                <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 border border-black/5 dark:border-white/5 font-mono text-sm">
                  {/* Absolute Dates & Time */}
                  <div className={guideRow}>
                    <span className={syntaxLabel}>..d</span>
                    <span className={resultLabel}>Stamp Current Date</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{date}"}</span>
                    <span className={resultLabel}>Current Date</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{time}"}</span>
                    <span className={resultLabel}>Current Time</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{datetime}"}</span>
                    <span className={resultLabel}>Date & Time</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{iso}"}</span>
                    <span className={resultLabel}>ISO Timestamp</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{unix}"}</span>
                    <span className={resultLabel}>Unix Timestamp</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>..log</span>
                    <span className={resultLabel}>Time Log Prefix</span>
                  </div>

                  {/* Relative Dates */}
                  <div className={guideRow}>
                    <span className={syntaxLabel}>..tomorrow</span>
                    <span className={resultLabel}>Tomorrow's Date</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>..yesterday</span>
                    <span className={resultLabel}>Yesterday's Date</span>
                  </div>

                  {/* Calendar Metadata */}
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{day}"}</span>
                    <span className={resultLabel}>Full Weekday Name</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{week}"}</span>
                    <span className={resultLabel}>ISO Week Number</span>
                  </div>

                  {/* List Items */}
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{todo}"}</span>
                    <span className={resultLabel}> - [ ] </span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{done}"}</span>
                    <span className={resultLabel}>- [x]</span>
                  </div>

                  {/* Emojis */}
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{check}"}</span>
                    <span className={resultLabel}>✅</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{error}"}</span>
                    <span className={resultLabel}>❌</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{idea}"}</span>
                    <span className={resultLabel}>💡</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{warn}"}</span>
                    <span className={resultLabel}>⚠️</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{fix}"}</span>
                    <span className={resultLabel}>🛠️</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{bug}"}</span>
                    <span className={resultLabel}>🐛</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{star}"}</span>
                    <span className={resultLabel}>⭐</span>
                  </div>

                  {/* System */}
                  <div className={guideRow}>
                    <span className={syntaxLabel}>/</span>
                    <span className={resultLabel}>Open Template Menu</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Link Pattern */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold opacity-30 uppercase tracking-widest">
                Link Logic
              </h3>
              <div className="bg-zinc-50 dark:bg-zinc-900/30 p-6 border border-black/5 dark:border-white/5">
                <div className="flex justify-between items-center mb-4 border-b border-black/5 pb-2">
                  <span className="text-[10px] uppercase opacity-40 tracking-widest">
                    Action
                  </span>
                  <span className="text-[10px] uppercase opacity-40 tracking-widest text-right">
                    Markdown Result
                  </span>
                </div>
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="opacity-80">Paste URL</span>
                  <code className="text-blue-600 dark:text-blue-400">
                    {"[link](https://...)"}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 05. BUDGET & CALCULATIONS --- */}
        <section className="border-t border-black/10 dark:border-white/10 pt-12">
          <span className={sectionHeading}>05. Financial Intelligence</span>
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Auto-Budgeting
                </h3>
                <p className="text-sm leading-relaxed opacity-80">
                  Hermes automatically sums all currency values found above a
                  line starting with <span className="font-mono">Total:</span>.
                </p>
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/20 font-mono text-[11px] space-y-1">
                  <div className="opacity-50">- Rent: $2000</div>
                  <div className="opacity-50">- Food: $400</div>
                  <div className="text-emerald-700 dark:text-emerald-300 font-bold">
                    Total: $2400.00
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Inline Math
                </h3>
                <p className="text-sm leading-relaxed opacity-80">
                  Execute quick math without leaving the document. Type the
                  expression and close it with an equals sign.
                </p>
                <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 border border-black/5 font-mono text-sm">
                  <div className={guideRow}>
                    <span className={syntaxLabel}>calc(100+50)=</span>
                    <span className={resultLabel}>150</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>calc(24*0.1)=</span>
                    <span className={resultLabel}>2.4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="pt-20 pb-12 text-center border-t border-black/5 dark:border-white/5">
          <p className="text-[10px] uppercase tracking-[0.4em] opacity-30 italic">
            Focus First — Stay Local
          </p>
        </footer>
      </div>
    </main>
  );
}
