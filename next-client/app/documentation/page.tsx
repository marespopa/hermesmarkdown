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
              <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/20 rounded-xl text-ui-footnote leading-relaxed uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400/80">
                Note: Cloud storage sync (Dropbox, iCloud) may lock files. We recommend pausing sync during active writing sessions for the smoothest experience.
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Internal Connectivity
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Connect your ideas using WikiLink syntax and organize them with tags. HermesMarkdown automatically indexes your vault for dynamic navigation and filtering.
              </p>
              <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm space-y-4">
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
              <p className="text-ui-footnote opacity-40 italic leading-relaxed font-bold uppercase tracking-widest">
                Navigation: CTRL + Click to open links. Click sidebar tags to filter your entire vault instantly.
              </p>
            </div>
          </div>

          {/* Smart Workspaces */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Smart Workspaces
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Workspaces are dynamic smart folders that filter your vault in real time. The built-in <strong>Today's Work</strong> folder shows files edited in the last 24 hours. Create your own with custom query rules.
              </p>
              <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
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
              <p className="text-ui-footnote opacity-40 italic leading-relaxed font-bold uppercase tracking-widest">
                Combine multiple rules with AND / OR logic for precise filtering.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Multi-Pane Editing
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Split your workspace into multiple editor panes. Drag tabs between panes, resize with the draggable separator, and work on several files side-by-side.
              </p>
              <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
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
        <section className="border-t border-black/5 dark:border-white/10 pt-20">
          <span className={sectionHeading}>02. Writing Experience</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Zen Mode
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Eliminate distractions and focus entirely on the active line. Zen Mode hides all sidebars and enables typewriter scrolling—the cursor stays anchored at 40% of the viewport.
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
                <div className={guideRow}>
                  <span className="text-sm font-medium">Narrow Width</span>
                  <span className={resultLabel}>~85 Characters</span>
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
                  <span className={resultLabel}>Click {"[ ]"} or {"[x]"}</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Cycle Status</span>
                  <span className={resultLabel}>Click any #tag</span>
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
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Date Picker
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                A calendar popup appears when your cursor rests on any recognized date format. Quickly change dates without retyping, and switch between date formats on the fly.
              </p>
              <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
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
              <p className="text-ui-footnote opacity-40 italic leading-relaxed font-bold uppercase tracking-widest">
                Keyboard: Arrow keys navigate days, Enter selects, Escape closes. Alt+Down opens picker.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Keyboard Shortcuts
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Most actions have a keyboard shortcut. Formatting shortcuts wrap any selected text automatically.
              </p>
              <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
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
                <div className={guideRow}>
                  <span className="text-sm font-medium">Open Link</span>
                  <span className={resultLabel}>CTRL+Click</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Date Picker</span>
                  <span className={resultLabel}>ALT+Down</span>
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-8 max-w-3xl mx-auto">
                {[
                  { tag: "#urgn", label: "Urgent" },
                  { tag: "#todo", label: "To-Do" },
                  { tag: "#prog", label: "Progress" },
                  { tag: "#wait", label: "Waiting" },
                  { tag: "#done", label: "Done" },
                ].map(({ tag, label }, i, arr) => (
                  <React.Fragment key={tag}>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-lg font-mono text-blue-400 dark:text-blue-600 font-bold">
                        {tag}
                      </span>
                      <span className="text-ui-footnote uppercase tracking-widest opacity-30 font-bold">{label}</span>
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
                  Date Shortcodes
                </h3>
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm font-mono text-xs">
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
                    <span className={resultLabel}>[HH:MM] ---</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{day}"}</span>
                    <span className={resultLabel}>Day Name</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{week}"}</span>
                    <span className={resultLabel}>Week Number</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.3em]">
                  Utility Shortcodes
                </h3>
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm font-mono text-xs">
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{todo}"}</span>
                    <span className={resultLabel}>{"- [ ] "} Task</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{done}"}</span>
                    <span className={resultLabel}>{"- [x] "} Task</span>
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
                    <span className={syntaxLabel}>{"{bug}"}</span>
                    <span className={resultLabel}>🐛</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{fix}"}</span>
                    <span className={resultLabel}>🛠️</span>
                  </div>
                  <div className={guideRow}>
                    <span className={syntaxLabel}>{"{star}"}</span>
                    <span className={resultLabel}>⭐</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
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

              <div className="space-y-6">
                <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.3em]">
                  Auto-Save Modes
                </h3>
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
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
                  <div className={guideRow}>
                    <span className="text-sm font-medium">Conflict Detection</span>
                    <span className={resultLabel}>On External Edit</span>
                  </div>
                </div>
                <p className="text-ui-footnote opacity-40 italic leading-relaxed font-bold uppercase tracking-widest">
                  Save status (saving, saved, error) is displayed in the status bar next to the filename.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- 04. TEMPLATES --- */}
        <section className="border-t border-black/5 dark:border-white/10 pt-20">
          <span className={sectionHeading}>04. Templates</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Slash Menu
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Type <code className="font-bold text-blue-600 dark:text-blue-400">/</code> on a blank line to open the template picker. Start typing to filter results. All shortcodes inside templates expand automatically on insert.
              </p>
              <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                <div className={guideRow}>
                  <span className="text-sm font-medium">Open Menu</span>
                  <span className={resultLabel}>Type /</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Insert Link</span>
                  <span className={resultLabel}>Type /link</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Insert WikiLink</span>
                  <span className={resultLabel}>Type /wikilink</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Insert Date</span>
                  <span className={resultLabel}>Type /date</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Filter</span>
                  <span className={resultLabel}>Keep Typing</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Navigate</span>
                  <span className={resultLabel}>Arrow Keys</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Insert</span>
                  <span className={resultLabel}>Enter</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">Dismiss</span>
                  <span className={resultLabel}>Escape</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Built-In Templates
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                A growing library of starter templates covers the most common writing contexts—ready to use with a single keystroke.
              </p>
              <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                <div className={guideRow}>
                  <span className="text-sm font-medium">🗓️ Daily Note</span>
                  <span className={resultLabel}>Journal + Tasks</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">📋 Meeting Notes</span>
                  <span className={resultLabel}>Agenda + Actions</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">🧠 Atomic Note</span>
                  <span className={resultLabel}>Linked Idea</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">📆 Weekly Review</span>
                  <span className={resultLabel}>Wins + Planning</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">✍️ Essay</span>
                  <span className={resultLabel}>Long-form Writing</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">📄 Frontmatter</span>
                  <span className={resultLabel}>YAML Header</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">📝 To-Do List</span>
                  <span className={resultLabel}>Task Checklist</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">📝 Notes</span>
                  <span className={resultLabel}>Quick Capture</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">💻 Dev Sprint</span>
                  <span className={resultLabel}>Dev Workflow</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">🤖 AI Prompt</span>
                  <span className={resultLabel}>Prompt Template</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">💰 Financial Plan</span>
                  <span className={resultLabel}>Budget + Totals</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">💪 Gym Log</span>
                  <span className={resultLabel}>Workout Tracker</span>
                </div>
                <div className={guideRow}>
                  <span className="text-sm font-medium">🗂️ Kanban Board</span>
                  <span className={resultLabel}>Task Columns</span>
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
