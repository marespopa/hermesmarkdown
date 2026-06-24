"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";

const SECTIONS = [
  { id: "writing",   label: "01. Writing"   },
  { id: "knowledge", label: "02. Knowledge" },
  { id: "templates", label: "03. Templates" },
  { id: "ai",        label: "04. AI"        },
  { id: "syntax",    label: "05. Syntax"    },
];

const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-sage/[0.05] dark:bg-sage/[0.03] blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] dark:bg-purple-500/[0.02] rounded-full blur-[100px]" />
    <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-[120px]" />
  </div>
);

export default function Documentation() {
  const router = useRouter();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setScrollProgress(scrollHeight > 0 ? scrollTop / scrollHeight : 0);

      for (const section of [...SECTIONS].reverse()) {
        const target = document.getElementById(section.id);
        if (target && target.getBoundingClientRect().top <= 120) {
          setActiveSection(section.id);
          return;
        }
      }
      setActiveSection("");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const sectionHeading = "text-ui-footnote uppercase tracking-[0.3em] font-bold text-sage dark:text-sage mb-8 block";
  const guideRow = "flex justify-between border-b border-black/5 dark:border-white/5 py-4 last:border-none items-center gap-4";
  const syntaxLabel = "font-mono text-sage dark:text-sage font-bold";
  const resultLabel = "opacity-40 italic text-right text-ui-footnote uppercase tracking-wider font-bold";

  return (
    <main className="selection:bg-sage/30 overflow-x-clip font-sans relative">
      {/* Scroll progress bar */}
      <div
        className="fixed top-0 left-0 h-[2px] bg-sage z-50 transition-all duration-75"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      <BackgroundGraphics />

      <div className="max-w-7xl mx-auto px-6 pt-20 lg:pt-32 pb-20 lg:pb-32 flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">

        {/* Sticky TOC sidebar */}
        <aside className="hidden lg:flex w-40 xl:w-44 shrink-0 sticky top-24 self-start">
          <nav className="space-y-1 w-full" aria-label="Table of contents">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`block text-ui-footnote font-bold uppercase tracking-[0.2em] py-1.5 px-3 rounded-lg transition-all duration-200 ${
                  activeSection === s.id
                    ? "text-sage dark:text-sage bg-blue-50 dark:bg-sage/10"
                    : "text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-24 lg:space-y-32">

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
              <h1 className="text-4xl sm:text-5xl md:text-8xl font-bold tracking-tight leading-[1.05]">
                Product{" "}
                <span className="text-neutral-400 dark:text-neutral-600 italic font-serif">
                  Documentation.
                </span>
              </h1>
            </div>
            <p className="text-lg md:text-2xl leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-3xl font-medium">
              Plain <code className="text-[0.75em] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono not-italic">.md</code> files, structured for agents. Works offline, saves to your machine, and connects to Claude Code, Cowork, or any agent you use.
            </p>
          </section>

          {/* --- 01. WRITING EXPERIENCE --- */}
          <section id="writing" className="border-t border-black/5 dark:border-white/10 pt-16 lg:pt-24 scroll-mt-24">
            <span className={sectionHeading}>01. Writing Experience</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Writing Mode</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    The app opens straight into a full-screen, chrome-free editor every time. Move your mouse to the left edge to peek at the sidebar, or pin it open when you need it.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">Reveal Sidebar</span><span className={resultLabel}>Hover Left Edge</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Pin Sidebar</span><span className={resultLabel}>CTRL+SHIFT+E</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Command Palette</span><span className={resultLabel}>CTRL+SHIFT+P</span></div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Click Actions</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Checkboxes toggle, tags cycle, and wiki links open — just click. No need to touch the raw Markdown.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">Toggle Task</span><span className={resultLabel}>Click {"[ ]"} or {"[x]"}</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Cycle Status</span><span className={resultLabel}>‹ #tag › Pill</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Navigate</span><span className={resultLabel}>CTRL + Click Link</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Date Picker</span><span className={resultLabel}>Click Calendar Icon</span></div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Date Picker</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Hover over any date in the editor and a calendar appears. Click a new date to update it in place.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="font-mono text-sm font-bold text-sage dark:text-sage">2025-06-04</span><span className={resultLabel}>ISO Format</span></div>
                  <div className={guideRow}><span className="font-mono text-sm font-bold text-sage dark:text-sage">06/04/2025</span><span className={resultLabel}>Slashed</span></div>
                  <div className={guideRow}><span className="font-mono text-sm font-bold text-sage dark:text-sage">04.06.2025</span><span className={resultLabel}>Dotted</span></div>
                  <div className={guideRow}><span className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">{"[[2025-06-04]]"}</span><span className={resultLabel}>WikiLink Date</span></div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Keyboard Shortcuts</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Standard shortcuts for formatting and navigation. Select text first, then apply — it wraps automatically.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">Save</span><span className={resultLabel}>CTRL+S</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Bold</span><span className={resultLabel}>CTRL+B</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Italic</span><span className={resultLabel}>CTRL+I</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Undo</span><span className={resultLabel}>CTRL+Z</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Command Palette</span><span className={resultLabel}>CTRL+SHIFT+P</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Pin Sidebar</span><span className={resultLabel}>CTRL+SHIFT+E</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Document Info</span><span className={resultLabel}>CTRL+SHIFT+I</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">AI Builder</span><span className={resultLabel}>CTRL+SHIFT+B</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Open Date Picker</span><span className={resultLabel}>ALT+↓ on date</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Open Link</span><span className={resultLabel}>CTRL+ENTER on pill</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Dismiss / Close</span><span className={resultLabel}>ESCAPE</span></div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Table Editor</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Click inside any pipe table to get a floating toolbar. Open the editor to manage rows, columns, sorting, and alignment — or grab a CSV copy with one click. Output is clean, auto-padded Markdown.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">Advanced Edit</span><span className={resultLabel}>Edit in Toolbar</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Delete Table</span><span className={resultLabel}>×Table in Toolbar</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Add / Delete Row</span><span className={resultLabel}>Advanced Dialog</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Add / Delete Column</span><span className={resultLabel}>Advanced Dialog</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Smart Sorting</span><span className={resultLabel}>Dates, Currency, Numbers</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Auto-Padding</span><span className={resultLabel}>Respects L/C/R Alignment</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">CSV Export</span><span className={resultLabel}>CSV in Toolbar</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Cell Navigation</span><span className={resultLabel}>Tab / Shift+Tab</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Quick New Row</span><span className={resultLabel}>Enter at end of row</span></div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Insert a Table</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Two ways to drop in a starter table. The cursor lands in the first cell, ready to type.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 font-mono text-xs">
                  <div className={guideRow}><span className={syntaxLabel}>/table</span><span className={resultLabel}>Slash Menu</span></div>
                  <div className={guideRow}><span className={syntaxLabel}>{"{table}"}</span><span className={resultLabel}>Shortcode</span></div>
                </div>
              </div>

            </div>
          </section>

          {/* --- 02. KNOWLEDGE MANAGEMENT --- */}
          <section id="knowledge" className="border-t border-black/5 dark:border-white/10 pt-16 lg:pt-24 scroll-mt-24">
            <span className={sectionHeading}>02. Knowledge Management</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Local-First Vaults</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Open any folder and it becomes your vault. Files are plain Markdown — always accessible, no lock-in.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">Open Vault</span><span className={resultLabel}>Ribbon Icon</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">New File</span><span className={resultLabel}>Sidebar + Button</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Rename / Delete</span><span className={resultLabel}>Context Menu</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">New Folder</span><span className={resultLabel}>Sidebar + Button</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Import File</span><span className={resultLabel}>Sidebar Import</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Export File</span><span className={resultLabel}>Sidebar Export</span></div>
                </div>
                <div className="p-5 bg-amber-500/5 dark:bg-amber-900/10 border border-amber-500/10 rounded-2xl text-ui-footnote leading-relaxed uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400/70">
                  Dropbox and iCloud can lock files while syncing. Pause them if you run into save issues.
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Internal Connectivity</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Link notes together with [[WikiLink]] syntax. The vault indexes everything so navigation stays fast without leaving the keyboard.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 space-y-4">
                  <div className={guideRow}><span className="font-mono text-sm text-purple-600 dark:text-purple-400 font-bold">{"[[Note Name]]"}</span><span className={resultLabel}>Internal Link</span></div>
                  <div className={guideRow}><span className="font-mono text-sm text-purple-600 dark:text-purple-400 font-bold">{"[[Name|Display]]"}</span><span className={resultLabel}>Aliased Link</span></div>
                  <div className={guideRow}><span className="font-mono text-sm text-purple-600 dark:text-purple-400 font-bold">{"[[2025-06-04]]"}</span><span className={resultLabel}>Date Link</span></div>
                  <div className={guideRow}><span className="font-mono text-sm text-sage dark:text-sage font-bold">#todo / #draft</span><span className={resultLabel}>Lifecycle Cycling (‹ ›)</span></div>
                </div>
                <p className="text-ui-micro opacity-40 italic leading-relaxed font-bold uppercase tracking-[0.2em] text-center">
                  Navigation: CTRL + Click to open links. Click tags to filter.
                </p>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Smart Workspaces</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Smart folders that filter your vault by tag, name, date, or word count. <strong>Today's Work</strong> is built in and shows everything touched in the last 24 hours.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">Filter by Tag</span><span className={resultLabel}>Query Builder</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Filter by Name</span><span className={resultLabel}>Query Builder</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Filter by Date</span><span className={resultLabel}>Query Builder</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Filter by Word Count</span><span className={resultLabel}>Query Builder</span></div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Multi-Pane Editing</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Open multiple files side by side. Drag tabs between panes and resize with the divider.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">Split Right</span><span className={resultLabel}>Tab Bar Icon</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Move Tab</span><span className={resultLabel}>Drag & Drop</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Resize Pane</span><span className={resultLabel}>Drag Divider</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Close Pane</span><span className={resultLabel}>Tab Bar Icon</span></div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Google Drive Sync</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Connect to Google Drive to sync your vault across devices. Uses the official API, stores files in a dedicated folder, and keeps everything under your control.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">Connect Drive</span><span className={resultLabel}>Settings ➔ Storage</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Sync Status</span><span className={resultLabel}>Status Bar Icon</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Conflict Handling</span><span className={resultLabel}>Auto-Merge</span></div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Agent-Specific Frontmatter</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    The fields below are the <strong>default schema</strong> — not a requirement. Drop any field you don&apos;t need, rename them, or skip frontmatter entirely. HermesMarkdown scores heading structure, typed fences, and tables independently, so a plain note still earns a real readability rating. A wizard opens on new files; click ✎ to edit later. For deeper automation, install <strong>Agent Skills</strong> from <strong>Settings → Guide</strong>.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 space-y-4">
                  <div className={guideRow}><span className={syntaxLabel}>title: "Name"</span><span className={resultLabel}>Primary Identifier</span></div>
                  <div className={guideRow}><span className={syntaxLabel}>status: draft</span><span className={resultLabel}>Lifecycle State</span></div>
                  <div className={guideRow}><span className={syntaxLabel}>scope: "..."</span><span className={resultLabel}>Agent Summary</span></div>
                  <div className={guideRow}><span className={syntaxLabel}>read_when: [...]</span><span className={resultLabel}>Agent Trigger</span></div>
                  <div className={guideRow}><span className={syntaxLabel}>related: [...]</span><span className={resultLabel}>Linked Files</span></div>
                  <div className={guideRow}><span className={syntaxLabel}>edit_elsewhere: [...]</span><span className={resultLabel}>External Locations</span></div>
                  <div className={guideRow}><span className={syntaxLabel}>tags: [ai, work]</span><span className={resultLabel}>Smart Category</span></div>
                </div>
                <p className="text-ui-micro opacity-40 italic leading-relaxed font-bold uppercase tracking-[0.2em] text-center">
                  Wizard auto-opens on new files. Click ✎ in the frontmatter header to edit later.
                </p>
              </div>

            </div>
          </section>

          {/* --- 03. TEMPLATES --- */}
          <section id="templates" className="border-t border-black/5 dark:border-white/10 pt-16 lg:pt-24 scroll-mt-24">
            <span className={sectionHeading}>03. Templates</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Slash Command Menu</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Type <code className="font-bold text-sage dark:text-sage">/</code> to open the command picker. Keep typing to filter — it matches as you go, highlights the characters, and shows each command's shortcut.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">Open Menu</span><span className={resultLabel}>Type /</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Fuzzy Filter</span><span className={resultLabel}>Keep Typing</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Navigate</span><span className={resultLabel}>↑ / ↓ Arrow Keys</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Insert</span><span className={resultLabel}>Enter or Tab</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Dismiss</span><span className={resultLabel}>Escape</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Insert Link</span><span className={resultLabel}>/ → link &nbsp;⌘K</span></div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Built-In Templates</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    A small set of ready-made templates for the things you write most often.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">⊞ Table</span><span className={resultLabel}>3×2 Grid</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">🗓️ Daily Note</span><span className={resultLabel}>Journal</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">📋 Meeting Notes</span><span className={resultLabel}>Agenda</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">🧠 Atomic Note</span><span className={resultLabel}>Linked Idea</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">✍️ Essay</span><span className={resultLabel}>Long-form</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">📄 Frontmatter</span><span className={resultLabel}>YAML</span></div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Structure Blocks</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Obsidian-style callouts and collapsible sections, written in plain Markdown so agents can parse them too.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5 font-mono text-xs">
                  <div className={guideRow}><span className={syntaxLabel}>/callout</span><span className={resultLabel}>note · info · tip</span></div>
                  <div className={guideRow}><span className={syntaxLabel}>/callout warning</span><span className={resultLabel}>danger Variants</span></div>
                  <div className={guideRow}><span className={syntaxLabel}>/collapse</span><span className={resultLabel}>Titled Section</span></div>
                </div>
              </div>

            </div>
          </section>

          {/* --- 04. AI & INTEGRATIONS --- */}
          <section id="ai" className="border-t border-black/5 dark:border-white/10 pt-16 lg:pt-24 scroll-mt-24">
            <span className={sectionHeading}>04. AI & Integrations</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Bring Your Own Key (BYOK)</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Set this up first — every AI action below stays hidden until a key is configured. Bring your own API key for Anthropic or Google. Keys are stored locally and never sent anywhere else.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">Anthropic Claude</span><span className={resultLabel}>Settings ➔ AI</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Google Gemini</span><span className={resultLabel}>Settings ➔ AI</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Local LLMs</span><span className={resultLabel}>Coming Soon</span></div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Inline AI Toolbar</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Select text and a toolbar appears above it. Every action — including a free-form prompt — opens a review dialog before anything touches your note.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">✨ Prompt Selection</span><span className={resultLabel}>Select → Toolbar</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">⚡ Improve Writing</span><span className={resultLabel}>Select → Toolbar</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">＋ Expand Idea</span><span className={resultLabel}>Select → Toolbar</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">Generate Frontmatter</span><span className={resultLabel}>Wizard / /frontmatter</span></div>
                </div>
                <p className="text-ui-micro opacity-40 italic leading-relaxed font-bold uppercase tracking-[0.2em] text-center">
                  All AI actions are triggered manually. Nothing runs without your intent.
                </p>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">AI Command Menu</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                    Type <code className="font-bold text-sage dark:text-sage">/</code> and pick a command from the AI group — only visible once a key is configured. Selection-based commands rewrite what you've highlighted; <strong>AI Builder</strong>, <strong>Generate Title</strong>, and <strong>Continue Writing</strong> work from a typed instruction or the surrounding note instead.
                  </p>
                </div>
                <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
                  <div className={guideRow}><span className="text-sm font-medium">🧱 AI Builder</span><span className={resultLabel}>Create / Revise Section</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">✨ Improve Writing</span><span className={resultLabel}>Clarity Pass</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">✅ Fix Spelling & Grammar</span><span className={resultLabel}>Light Correction</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">✂️ Shorten / ➕ Expand</span><span className={resultLabel}>Compress / Elaborate</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">🎩 Change Tone</span><span className={resultLabel}>Formal · Casual · Direct · Polished</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">📃 Summarize</span><span className={resultLabel}>Concise Recap</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">🗒️ Extract Tasks</span><span className={resultLabel}>Markdown Checklist</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">📑 Create Outline</span><span className={resultLabel}>Headings + Bullets</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">🏷️ Generate Title</span><span className={resultLabel}>From Note / Selection</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">➡️ Continue Writing</span><span className={resultLabel}>From Cursor</span></div>
                  <div className={guideRow}><span className="text-sm font-medium">❓ Explain Selection</span><span className={resultLabel}>Plain-Language Recap</span></div>
                </div>
                <p className="text-ui-micro opacity-40 italic leading-relaxed font-bold uppercase tracking-[0.2em] text-center">
                  Diff Review: Red = Removed, Green = Added — then Replace, Insert Below, or Cancel.
                </p>
              </div>

            </div>
          </section>

          {/* --- 05. SYNTAX & SHORTCUTS --- */}
          <section id="syntax" className="border-t border-black/5 dark:border-white/10 pt-16 lg:pt-24 scroll-mt-24">
            <span className={sectionHeading}>05. Syntax & Shortcuts</span>

            <div className="space-y-20">
              {/* Workflow Lifecycle */}
              <div className="p-16 md:p-24 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-[4rem] relative overflow-hidden border border-black/5 dark:border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sage/10 blur-[120px] -mr-64 -mt-64" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] -ml-64 -mb-64" />

                <h3 className="text-xs font-bold mb-12 opacity-30 uppercase tracking-[0.4em] text-center relative z-10">
                  Document Lifecycle
                </h3>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-10 max-w-4xl mx-auto relative z-10">
                  {[
                    { tag: "#draft",    label: "Draft",    color: "text-amber-600 dark:text-amber-400"   },
                    { tag: "#review",   label: "Review",   color: "text-blue-600 dark:text-blue-400"     },
                    { tag: "#active",   label: "Active",   color: "text-emerald-600 dark:text-emerald-400"},
                    { tag: "#archived", label: "Archived", color: "text-zinc-500 dark:text-zinc-400"     },
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

                <div className="my-12 border-t border-black/10 dark:border-white/5 relative z-10" />

                <h3 className="text-xs font-bold mb-12 opacity-30 uppercase tracking-[0.4em] text-center relative z-10">
                  Task Lifecycle
                </h3>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-10 max-w-2xl mx-auto relative z-10">
                  {[
                    { tag: "#todo", label: "To Do",      color: "text-violet-600 dark:text-violet-400" },
                    { tag: "#prog", label: "In Progress", color: "text-orange-600 dark:text-orange-400" },
                    { tag: "#done", label: "Done",        color: "text-teal-600 dark:text-teal-400"     },
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
                  Cursor on any lifecycle tag reveals a <code className="not-italic font-mono">‹ #tag ›</code> pill. Step forward or backward with the arrows. Document tags stay in sync with the <code className="not-italic font-mono">status:</code> frontmatter field.
                </p>
              </div>

              {/* Syntax Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
                <div className="space-y-8">
                  <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.4em]">Date Shortcodes</h3>
                  <div className="bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm p-8 rounded-3xl border border-black/5 dark:border-white/5 font-mono text-xs">
                    <div className={guideRow}><span className={syntaxLabel}>..d &nbsp;or&nbsp; {"{date}"}</span><span className={resultLabel}>Today's Date</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>..tomorrow</span><span className={resultLabel}>Tomorrow</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>..yesterday</span><span className={resultLabel}>Yesterday</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{day}"}</span><span className={resultLabel}>Day Name</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{time}"}</span><span className={resultLabel}>Current Time</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{datetime}"}</span><span className={resultLabel}>Date + Time</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{iso}"}</span><span className={resultLabel}>ISO Timestamp</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{unix}"}</span><span className={resultLabel}>Unix Timestamp</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>..log</span><span className={resultLabel}>Timestamped Log</span></div>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.4em]">Utility Shortcodes</h3>
                  <div className="bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm p-8 rounded-3xl border border-black/5 dark:border-white/5 font-mono text-xs">
                    <div className={guideRow}><span className={syntaxLabel}>{"{todo}"}</span><span className={resultLabel}>{"- [ ] "} Task</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{done}"}</span><span className={resultLabel}>{"- [x] "} Task</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{table}"}</span><span className={resultLabel}>3×2 Table</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>/</span><span className={resultLabel}>Template Menu</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{check}"}</span><span className={resultLabel}>✅</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{idea}"}</span><span className={resultLabel}>💡</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{error}"}</span><span className={resultLabel}>❌</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{warn}"}</span><span className={resultLabel}>⚠️</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{fix}"}</span><span className={resultLabel}>🛠️</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{bug}"}</span><span className={resultLabel}>🐛</span></div>
                    <div className={guideRow}><span className={syntaxLabel}>{"{star}"}</span><span className={resultLabel}>⭐</span></div>
                  </div>
                </div>
              </div>

              {/* Financial */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
                <div className="space-y-8">
                  <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.4em]">Financial Intelligence</h3>
                  <div className="bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm p-8 rounded-3xl border border-black/5 dark:border-white/5 space-y-6">
                    <div className="space-y-3">
                      <p className="text-ui-footnote leading-relaxed text-neutral-500 dark:text-neutral-400 font-medium">
                        A line starting with <code className="font-bold text-sage dark:text-sage">Total:</code> auto-sums the currency values above it. Set your currency in <strong>Settings → Currency</strong>.
                      </p>
                      <div className="p-5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl font-mono text-ui-footnote">
                        <div className="opacity-40">- Rent: $2,000</div>
                        <div className="opacity-40">- Food: $400</div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold mt-2 pt-2 border-t border-emerald-500/10">Total: $2,400.00</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-ui-footnote leading-relaxed text-neutral-500 dark:text-neutral-400 font-medium">
                        Inside a table, place <code className="font-bold text-sage dark:text-sage">Total:</code> in a cell to sum <em>only that column</em>. Use the <strong>Σ button</strong> in the table dialog header to insert a total row automatically.
                      </p>
                      <div className="p-5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl font-mono text-ui-footnote space-y-0.5">
                        <div className="opacity-40">| Item &nbsp;&nbsp; | Amount &nbsp;&nbsp;|</div>
                        <div className="opacity-40">| ------| ----------|</div>
                        <div className="opacity-40">| Rent &nbsp; | $2,000 &nbsp; |</div>
                        <div className="opacity-40">| Food &nbsp; | $400 &nbsp;&nbsp; |</div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold">| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Total: &nbsp;&nbsp;&nbsp;|</div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-4">
                      <div className={guideRow}><span className={syntaxLabel}>calc(100+50)=</span><span className={resultLabel}>150</span></div>
                      <div className={guideRow}><span className="text-sm font-medium">Add Total Row</span><span className={resultLabel}>Σ in Table Dialog</span></div>
                      <div className={guideRow}><span className="text-sm font-medium">Set Currency</span><span className={resultLabel}>Settings → Currency</span></div>
                      <div className="p-4 bg-sage/5 border border-sage/10 rounded-2xl text-ui-micro uppercase tracking-widest font-bold text-sage dark:text-sage/70">
                        Multiple Currencies Supported: USD ($), EUR (€), GBP (£), JPY (¥), INR (₹), CAD (C$), AUD (A$), and RON (lei).
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.4em]">Auto-Save Modes</h3>
                  <div className="bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm p-8 rounded-3xl border border-black/5 dark:border-white/5">
                    <div className={guideRow}><span className="text-sm font-medium">After Delay</span><span className={resultLabel}>0.5s – 10s</span></div>
                    <div className={guideRow}><span className="text-sm font-medium">On Focus Change</span><span className={resultLabel}>Auto</span></div>
                    <div className={guideRow}><span className="text-sm font-medium">Manual</span><span className={resultLabel}>CTRL+S</span></div>
                  </div>
                  <p className="text-ui-micro opacity-40 italic leading-relaxed font-bold uppercase tracking-[0.2em] text-center">
                    Save status is displayed in the status bar.
                  </p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
