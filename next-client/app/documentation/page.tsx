"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";

const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    {/* Minimalist Grid Pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    
    {/* Sophisticated Ambient Glows */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-gradient-radial from-blue-500/[0.05] dark:from-blue-500/[0.03] via-transparent to-transparent blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] dark:bg-purple-500/[0.02] rounded-full blur-[100px]" />
    <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-[120px]" />
    
    {/* Focus Lines (Vertical accents) */}
    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-neutral-200 dark:via-neutral-800 to-transparent opacity-20" />
  </div>
);

export default function Documentation() {
  const router = useRouter();

  const sectionHeading = "text-ui-footnote uppercase tracking-[0.3em] font-bold text-blue-600 dark:text-blue-400 mb-8 block";
  const guideRow = "flex justify-between border-b border-black/5 dark:border-white/5 py-4 last:border-none items-center gap-4";
  const syntaxLabel = "font-mono text-blue-600 dark:text-blue-400 font-bold";
  const resultLabel = "opacity-40 italic text-right text-ui-footnote uppercase tracking-wider font-bold";

  return (
    <main className="min-h-screen selection:bg-blue-500/30 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-[#050505] overflow-x-hidden font-sans relative">
      <BackgroundGraphics />
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
          <div className="space-y-4">
            <h1 className="text-5xl md:text-8xl font-bold tracking-tight leading-[1.05]">
              Product{" "}
              <span className="text-neutral-400 dark:text-neutral-600 italic font-serif">
                Documentation.
              </span>
            </h1>
          </div>
          <p className="text-lg md:text-2xl leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-3xl font-medium">
            HermesMarkdown is a professional, local-first workspace built for deep work. No cloud, no tracking, no friction—just a clean canvas for your thoughts.
          </p>
        </section>

        {/* --- 01. KNOWLEDGE MANAGEMENT --- */}
        <section className="border-t border-black/5 dark:border-white/10 pt-24">
          <span className={sectionHeading}>01. Knowledge Management</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold tracking-tight">
                  Local-First Vaults
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                  Open any local directory to treat it as a writing vault. Browse files, manage folders, and save changes directly to your machine using modern web standards.
                </p>
              </div>
              <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                <div className={guideRow}>
                  <span className="text-sm font-medium">Open Vault</span>
                  <span className={resultLabel}>Ribbon Icon</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">New File</span>
                  <span className={resultLabel}>Sidebar + Button</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Rename / Delete</span>
                  <span className={resultLabel}>Context Menu</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">New Folder</span>
                  <span className={resultLabel}>Sidebar + Button</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Import File</span>
                  <span className={resultLabel}>Sidebar Import</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Export File</span>
                  <span className={resultLabel}>Sidebar Export</span>
                </div>
              </div>
              <div className="p-5 bg-amber-500/5 dark:bg-amber-900/10 border border-amber-500/10 rounded-2xl text-ui-footnote leading-relaxed uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400/70">
                Note: Cloud storage sync (Dropbox, iCloud) may lock files. We recommend pausing sync during active writing sessions.
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold tracking-tight">
                  Internal Connectivity
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                  Connect your ideas using WikiLink syntax and organize them with tags. HermesMarkdown automatically indexes your vault for dynamic navigation.
                </p>
              </div>
              <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 shadow-inner space-y-4">
                <div className={guideRow}>
                  <span className="font-mono text-sm text-purple-600 dark:text-purple-400 font-bold">{"[[Note Name]]"}</span>
                  <span className={resultLabel}>Internal Link</span>
                </div>
                <div className={guideRow}>
                  <span className="font-mono text-sm text-purple-600 dark:text-purple-400 font-bold">{"[[Name|Display]]"}</span>
                  <span className={resultLabel}>Aliased Link</span>
                </div>
                <div className={guideRow}>
                  <span className="font-mono text-sm text-purple-600 dark:text-purple-400 font-bold">{"[[2025-06-04]]"}</span>
                  <span className={resultLabel}>Date Link</span>
                </div>
                <div className={guideRow}>
                  <span className="font-mono text-sm text-blue-600 dark:text-blue-400 font-bold">#todo</span>
                  <span className={resultLabel}>Smart Filter</span>
                </div>
              </div>
              <p className="text-ui-micro opacity-40 italic leading-relaxed font-bold uppercase tracking-[0.2em] text-center">
                Navigation: CTRL + Click to open links. Click tags to filter.
              </p>
            </div>
          </div>

          {/* Smart Workspaces */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold tracking-tight">
                  Smart Workspaces
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                  Workspaces are dynamic smart folders that filter your vault in real time. The built-in <strong>Today's Work</strong> folder shows files edited in the last 24 hours.
                </p>
              </div>
              <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                <div className={guideRow}>
                  <span className="text-sm font-medium">Filter by Tag</span>
                  <span className={resultLabel}>Query Builder</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Filter by Name</span>
                  <span className={resultLabel}>Query Builder</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Filter by Date</span>
                  <span className={resultLabel}>Query Builder</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Filter by Word Count</span>
                  <span className={resultLabel}>Query Builder</span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold tracking-tight">
                  Multi-Pane Editing
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                  Split your workspace into multiple editor panes. Drag tabs between panes, resize with the draggable separator, and work on several files side-by-side.
                </p>
              </div>
              <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                <div className={guideRow}>
                  <span className="text-sm font-medium">Split Right</span>
                  <span className={resultLabel}>Tab Bar Icon</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Move Tab</span>
                  <span className={resultLabel}>Drag & Drop</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Resize Pane</span>
                  <span className={resultLabel}>Drag Divider</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Close Pane</span>
                  <span className={resultLabel}>Tab Bar Icon</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 02. WRITING EXPERIENCE --- */}
        <section className="border-t border-black/5 dark:border-white/10 pt-24">
          <span className={sectionHeading}>02. Writing Experience</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold tracking-tight">
                  Zen Mode
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                  Eliminate distractions and focus entirely on the active line. Zen Mode hides all sidebars and applies a subtle focus tint to isolate your current thought.
                </p>
              </div>
              <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                <div className={guideRow}>
                  <span className="text-sm font-medium">Toggle Zen</span>
                  <span className={resultLabel}>CTRL+SHIFT+Z</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Focus Highlight</span>
                  <span className={resultLabel}>Active Line Tint</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Narrow Width</span>
                  <span className={resultLabel}>~85 Characters</span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold tracking-tight">
                  Click Actions
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                  Elements in the editor are live. Clicking them modifies the underlying text automatically without needing to type syntax.
                </p>
              </div>
              <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                <div className={guideRow}>
                  <span className="text-sm font-medium">Toggle Task</span>
                  <span className={resultLabel}>Click {"[ ]"} or {"[x]"}</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Cycle Status</span>
                  <span className={resultLabel}>‹ #tag › Pill</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Navigate</span>
                  <span className={resultLabel}>CTRL + Click Link</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Date Picker</span>
                  <span className={resultLabel}>Click Calendar Icon</span>
                </div>
              </div>
            </div>
          </div>

          {/* Date Picker */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold tracking-tight">
                  Date Picker
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                  A calendar popup appears when your cursor rests on any recognized date format. Quickly change dates without retyping.
                </p>
              </div>
              <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                <div className={guideRow}>
                  <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">2025-06-04</span>
                  <span className={resultLabel}>ISO Format</span>
                </div>
                <div className={guideRow}>
                  <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">06/04/2025</span>
                  <span className={resultLabel}>Slashed</span>
                </div>
                <div className={guideRow}>
                  <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">04.06.2025</span>
                  <span className={resultLabel}>Dotted</span>
                </div>
                <div className={guideRow}>
                  <span className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">{"[[2025-06-04]]"}</span>
                  <span className={resultLabel}>WikiLink Date</span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold tracking-tight">
                  Keyboard Shortcuts
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                  Most actions have a keyboard shortcut. Formatting shortcuts wrap any selected text automatically.
                </p>
              </div>
              <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                <div className={guideRow}>
                  <span className="text-sm font-medium">Save</span>
                  <span className={resultLabel}>CTRL+S</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Bold</span>
                  <span className={resultLabel}>CTRL+B</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Italic</span>
                  <span className={resultLabel}>CTRL+I</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Zen Mode</span>
                  <span className={resultLabel}>CTRL+SHIFT+Z</span>
                </div>
              </div>
            </div>
          </div>
          {/* Table Editor */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold tracking-tight">
                  Table Editor
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                  Place your cursor anywhere inside a pipe table to reveal a floating toolbar for quick structural edits, or open the Advanced Table Dialog for refined tabular editing, smart data sorting, and auto-padded markdown alignment.
                </p>
              </div>
              <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                <div className={guideRow}>
                  <span className="text-sm font-medium">Advanced Edit</span>
                  <span className={resultLabel}>Click Edit in Toolbar</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Smart Sorting</span>
                  <span className={resultLabel}>Dates, Currency, Numbers</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Auto-Padding</span>
                  <span className={resultLabel}>Respects L/C/R Alignment</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">CSV Export</span>
                  <span className={resultLabel}>Copy Table as CSV</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Cell Navigation</span>
                  <span className={resultLabel}>Tab / Shift+Tab</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Quick New Row</span>
                  <span className={resultLabel}>Enter at end of row</span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold tracking-tight">
                  Insert a Table
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                  Two ways to insert a starter 3×2 table — cursor lands in the first header cell automatically.
                </p>
              </div>
              <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 shadow-inner font-mono text-xs">
                <div className={guideRow}>
                  <span className={syntaxLabel}>/table</span>
                  <span className={resultLabel}>Slash Menu</span>
                </div>
                <div className={guideRow}>
                  <span className={syntaxLabel}>{"{table}"}</span>
                  <span className={resultLabel}>Shortcode</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 03. SYNTAX & SHORTCUTS --- */}
        <section className="border-t border-black/5 dark:border-white/10 pt-24">
          <span className={sectionHeading}>03. Syntax & Shortcuts</span>

          <div className="space-y-20">
            {/* Workflow Lifecycle */}
            <div className="p-16 md:p-24 bg-neutral-950 dark:bg-neutral-900 text-white rounded-[4rem] shadow-2xl relative overflow-hidden border border-white/5">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] -mr-64 -mt-64" />
              <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] -ml-64 -mb-64" />

              {/* Document lifecycle */}
              <h3 className="text-xs font-bold mb-12 opacity-30 uppercase tracking-[0.4em] text-center relative z-10">
                Document Lifecycle
              </h3>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-10 max-w-4xl mx-auto relative z-10">
                {[
                  { tag: "#draft",    label: "Draft",    color: "text-amber-400"  },
                  { tag: "#review",   label: "Review",   color: "text-blue-400"   },
                  { tag: "#active",   label: "Active",   color: "text-emerald-400"},
                  { tag: "#archived", label: "Archived", color: "text-zinc-400"   },
                ].map(({ tag, label, color }, i, arr) => (
                  <React.Fragment key={tag}>
                    <div className="flex flex-col items-center gap-3 group">
                      <span className={`text-2xl font-mono font-bold group-hover:scale-110 transition-transform cursor-default ${color}`}>
                        {tag}
                      </span>
                      <span className="text-ui-micro uppercase tracking-widest opacity-30 font-bold">{label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <span className="opacity-10 hidden sm:block text-2xl">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Divider */}
              <div className="my-12 border-t border-white/5 relative z-10" />

              {/* Task lifecycle */}
              <h3 className="text-xs font-bold mb-12 opacity-30 uppercase tracking-[0.4em] text-center relative z-10">
                Task Lifecycle
              </h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-10 max-w-2xl mx-auto relative z-10">
                {[
                  { tag: "#todo", label: "To Do",       color: "text-violet-400" },
                  { tag: "#prog", label: "In Progress",  color: "text-orange-400" },
                  { tag: "#done", label: "Done",         color: "text-teal-400"   },
                ].map(({ tag, label, color }, i, arr) => (
                  <React.Fragment key={tag}>
                    <div className="flex flex-col items-center gap-3 group">
                      <span className={`text-2xl font-mono font-bold group-hover:scale-110 transition-transform cursor-default ${color}`}>
                        {tag}
                      </span>
                      <span className="text-ui-micro uppercase tracking-widest opacity-30 font-bold">{label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <span className="opacity-10 hidden sm:block text-2xl">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <p className="mt-16 text-center text-ui-footnote opacity-40 italic max-w-md mx-auto leading-relaxed relative z-10 font-medium">
                Place your cursor on any lifecycle tag to reveal a <code className="not-italic font-mono">‹ #tag ›</code> pill. Use the arrows to step forward or backward through states. Document tags also mirror the <code className="not-italic font-mono">status:</code> frontmatter field.
              </p>
            </div>

            {/* Syntax Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
              <div className="space-y-8">
                <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.4em]">
                  Date Shortcodes
                </h3>
                <div className="bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-inner font-mono text-xs">
                  <div className={guideRow}>
                    <span className={syntaxLabel}>..d &nbsp;or&nbsp; {"{date}"}</span>
                    <span className={resultLabel}>Today's Date</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>..tomorrow</span>
                    <span className={resultLabel}>Tomorrow</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>..yesterday</span>
                    <span className={resultLabel}>Yesterday</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{time}"}</span>
                    <span className={resultLabel}>Current Time</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{datetime}"}</span>
                    <span className={resultLabel}>Date + Time</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.4em]">
                  Utility Shortcodes
                </h3>
                <div className="bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-inner font-mono text-xs">
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{todo}"}</span>
                    <span className={resultLabel}>{"- [ ] "} Task</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{done}"}</span>
                    <span className={resultLabel}>{"- [x] "} Task</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{table}"}</span>
                    <span className={resultLabel}>3×2 Table</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>/</span>
                    <span className={resultLabel}>Template Menu</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{check}"}</span>
                    <span className={resultLabel}>✅</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{idea}"}</span>
                    <span className={resultLabel}>💡</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
              <div className="space-y-8">
                <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.4em]">
                  Financial Intelligence
                </h3>
                <div className="bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-inner space-y-6">
                  <div className="space-y-3">
                    <p className="text-ui-footnote leading-relaxed text-neutral-500 dark:text-neutral-400 font-medium">
                      HermesMarkdown sums all currency values found above a line starting with <code className="font-bold text-blue-600 dark:text-blue-400">Total:</code>.
                    </p>
                    <div className="p-5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl font-mono text-ui-footnote">
                      <div className="opacity-40">- Rent: $2000</div>
                      <div className="opacity-40">- Food: $400</div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold mt-2 pt-2 border-t border-emerald-500/10">Total: $2400.00</div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-black/5 dark:border-white/5">
                    <div className={guideRow}>
                      <span className={syntaxLabel}>calc(100+50)=</span>
                      <span className={resultLabel}>150</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.4em]">
                  Auto-Save Modes
                </h3>
                <div className="bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                  <div className={guideRow}>
                    <span className="text-sm font-medium">After Delay</span>
                    <span className={resultLabel}>0.5s – 10s</span>
                  </div>
                  <div className={guideRow}>
                    <span className="text-sm font-medium">On Focus Change</span>
                    <span className={resultLabel}>Auto</span>
                  </div>
                  <div className={guideRow}>
                    <span className="text-sm font-medium">Manual</span>
                    <span className={resultLabel}>CTRL+S</span>
                  </div>
                </div>
                <p className="text-ui-micro opacity-40 italic leading-relaxed font-bold uppercase tracking-[0.2em] text-center">
                  Save status is displayed in the status bar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- 04. TEMPLATES --- */}
        <section className="border-t border-black/5 dark:border-white/10 pt-24">
          <span className={sectionHeading}>04. Templates</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold tracking-tight">
                  Slash Command Menu
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                  Type <code className="font-bold text-blue-600 dark:text-blue-400">/</code> at the start of a line or after a space to open the command picker. Continue typing to fuzzy-filter — matching characters are highlighted in-row. Each entry shows an icon, a short description, and an optional keyboard shortcut.
                </p>
              </div>
              <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                <div className={guideRow}>
                  <span className="text-sm font-medium">Open Menu</span>
                  <span className={resultLabel}>Type /</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Fuzzy Filter</span>
                  <span className={resultLabel}>Keep Typing</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Navigate</span>
                  <span className={resultLabel}>↑ / ↓ Arrow Keys</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Insert</span>
                  <span className={resultLabel}>Enter or Tab</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Dismiss</span>
                  <span className={resultLabel}>Escape</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Insert Link</span>
                  <span className={resultLabel}>/ → link &nbsp;⌘K</span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold tracking-tight">
                  Built-In Templates
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                  A starter library covers the most common writing contexts—ready to use with a single keystroke.
                </p>
              </div>
              <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                <div className={guideRow}>
                  <span className="text-sm font-medium">⊞ Table</span>
                  <span className={resultLabel}>3×2 Grid</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">🗓️ Daily Note</span>
                  <span className={resultLabel}>Journal</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">📋 Meeting Notes</span>
                  <span className={resultLabel}>Agenda</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">🧠 Atomic Note</span>
                  <span className={resultLabel}>Linked Idea</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">✍️ Essay</span>
                  <span className={resultLabel}>Long-form</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">📄 Frontmatter</span>
                  <span className={resultLabel}>YAML</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
