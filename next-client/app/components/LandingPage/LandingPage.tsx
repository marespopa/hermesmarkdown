"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { atom_content } from "@/app/atoms/atoms";
import LoadingOverlay from "@/app/components/LoadingOverlay/LoadingOverlay";
import Button from "@/app/components/Button/Button.component";
import dynamic from "next/dynamic";
import Toast from "@/app/components/Toast";
import { FiFileText } from "react-icons/fi";
import { HiMicrophone, HiOutlineMicrophone } from "react-icons/hi";
import { useGlobalVoiceInput } from "@/app/editor/hooks/use-global-voice-input";

const MarkdownEditor = dynamic(
  () => import("@/app/editor/components/MarkdownEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full flex items-center justify-center bg-paper-light dark:bg-paper-dark rounded-b-xl border border-t-0 border-black/5 dark:border-white/5">
        <div className="text-xs uppercase tracking-widest opacity-30 animate-pulse">
          Initializing Workspace...
        </div>
      </div>
    ),
  },
);

// EditablePreview removed — demo uses MarkdownEditor only

const VoicePreviewPanel = dynamic(
  () => import("@/app/editor/components/VoicePreviewPanel"),
  { ssr: false },
);

const MermaidDialog = dynamic(
  () => import("@/app/editor/components/MermaidDialog"),
  { ssr: false },
);

const ImageDialog = dynamic(
  () => import("@/app/editor/components/ImageDialog"),
  { ssr: false },
);

const FilesystemGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative">
    <div className="font-mono text-[11px] leading-relaxed text-left select-none w-full max-w-[260px]">
      <div className="flex items-center gap-1.5 text-sage dark:text-sage font-semibold mb-1">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        hermes_vault/
      </div>
      <div className="border-l border-neutral-300 dark:border-neutral-700 ml-[6px] pl-3 space-y-1">
        {[
          "daily-notes.md",
          "project-ideas.md",
          "ops-log-june.md",
          "api-design.md",
          "meeting-2026.md",
        ].map((name, i) => (
          <div
            key={name}
            className="flex items-center gap-1.5"
            style={{ opacity: 0.65 - i * 0.1 }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {name}
          </div>
        ))}
      </div>
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">
        Connected
      </span>
    </div>
  </div>
);

const ZenModeGraphic = () => {
  return (
    <div className="w-full h-full flex items-center justify-center p-8 relative overflow-hidden group/zen">
      <div className="absolute inset-0 bg-neutral-50/50 dark:bg-black/20 -z-10" />
      <div className="w-full max-w-[280px]">
        <svg
          width="100%"
          height="120"
          viewBox="0 0 280 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <rect
            x="0"
            y="0"
            width="160"
            height="4"
            rx="2"
            className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity"
          />
          <rect
            x="0"
            y="16"
            width="220"
            height="4"
            rx="2"
            className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity"
          />
          <rect
            x="0"
            y="32"
            width="190"
            height="4"
            rx="2"
            className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity"
          />
          <rect
            x="0"
            y="56"
            width="250"
            height="6"
            rx="3"
            className="fill-neutral-800 dark:fill-neutral-200"
          />
          <rect
            x="0"
            y="84"
            width="200"
            height="4"
            rx="2"
            className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity"
          />
          <rect
            x="0"
            y="100"
            width="140"
            height="4"
            rx="2"
            className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity"
          />
          <rect
            x="0"
            y="116"
            width="170"
            height="4"
            rx="2"
            className="fill-neutral-300 dark:fill-neutral-700 opacity-40 group-hover/zen:opacity-60 transition-opacity"
          />
        </svg>
      </div>
      <div className="absolute top-4 right-4">
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] font-bold opacity-40">
          Writing Mode
        </span>
      </div>
    </div>
  );
};

const SmartSyntaxGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative select-none">
    <div className="font-mono text-[11px] leading-loose text-left w-full max-w-[280px] space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500">
          #draft
        </span>
        <span className="opacity-50">Redesign API layer</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
          #active
        </span>
        <span className="opacity-50">Vault schema migration</span>
      </div>

      <div className="h-px bg-neutral-300 dark:bg-neutral-700 opacity-40 my-1" />

      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-violet-500/15 text-violet-500">
          #todo
        </span>
        <span className="opacity-50">Auth token refresh</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-500">
          #prog
        </span>
        <span className="opacity-50">API layer rebuild</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-500">
          #done
        </span>
        <span className="opacity-50">Vault schema migration</span>
      </div>

      <div className="h-px bg-neutral-300 dark:bg-neutral-700 opacity-40 my-1" />

      <div className="opacity-50">| Hosting | $120 |</div>
      <div className="opacity-50">| Design | $340 |</div>
      <div className="flex items-center gap-1.5">
        <span className="opacity-50">| Total | $460.00 |</span>
      </div>

      <div className="h-px bg-neutral-300 dark:bg-neutral-700 opacity-40 my-1" />

      <div className="flex items-center gap-1.5">
        <span className="opacity-50">Sprint ends</span>
        <span className="border-b border-amber-500/60 text-amber-500">
          2026-06-14
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-500 opacity-70"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500 opacity-60">
        Smart Syntax
      </span>
    </div>
  </div>
);

const AIKeyGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative select-none">
    <div className="w-full max-w-[280px] space-y-3">
      <div className="p-3 rounded-lg border border-black/5 dark:border-white/10 bg-surface dark:bg-surface/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-mono font-bold">
              Claude 4.6 Sonnet
            </span>
          </div>
          <span className="text-[9px] opacity-40">Active</span>
        </div>
        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full w-full bg-emerald-500/20" />
        </div>
      </div>
      <div className="p-3 rounded-lg border border-black/5 dark:border-white/10 bg-surface dark:bg-surface/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] font-mono font-bold">
              Gemini 3.5 Flash
            </span>
          </div>
          <span className="text-[9px] opacity-40">Configured</span>
        </div>
        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-amber-500/20" />
        </div>
      </div>
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 opacity-60">
        BYO API Keys
      </span>
    </div>
  </div>
);

const DEFAULT_DEMO_CONTENT = `---
title: Welcome to HermesMarkdown
status: draft
tags: [demo, getting-started]
---

# HermesMarkdown

Hello — let's meet the markdown editor that keeps your notes plain, local, and readable by both you and your AI agents.

## It's just a file

No account, no database, no upload step. This note lives as a plain file on disk — open it in any other editor, sync it with Dropbox, or move it to another machine. HermesMarkdown never restructures your folders or writes files of its own into them.

> [!tip] Try it
> Click anywhere in this paragraph to start writing. Open Mermaid diagrams in a dialog whenever you want to inspect them visually.

## Write directly in Markdown

This note stays a plain Markdown file. HermesMarkdown lets you write directly in it, while Mermaid diagrams open in a dialog with zoom controls when you need a closer look.

\`\`\`mermaid
flowchart LR
    A[Write Markdown] --> B{Need a diagram?}
    B -- Yes --> C[Add a mermaid block]
    C --> D[Click to view full-size]
    B -- No --> D
\`\`\`

Hover the block above and click the trigger button to open it full-size in a dedicated dialog with zoom and pan.

Need quick arithmetic? Type \`calc(4*12)=\` anywhere and it resolves itself the moment you type the closing \`=\`: calc(4*12)=48.

## Images, viewed full-size

Drop an image into a note the usual way and it stays a plain link — nothing is copied into the document itself.

![A calm morning view](/assets/hero/niceday.jpg)

Hover the image above and click the trigger button to open the actual image in a dialog, the same way Mermaid diagrams do.

## Write the way you already do

**Bold**, *italic*, ~~strikethrough~~, \`inline code\` — all standard Markdown, all rendered as you type.

- Bulleted lists
- Nest them with Tab
  - Like this

1. Numbered lists work too
2. And renumber themselves automatically

- [ ] Uncompleted task — click the box
- [x] Completed task
- [ ] Task in progress #prog

Every checkbox here is live. Toggle one and it writes straight back to this file — no separate save step, no separate view.

## Tables that stay plain text

Click into a table for a floating toolbar — sort a column, copy as CSV, delete a row. What gets written back is clean, auto-padded Markdown.

| Feature         | Category   | Released | Rating |
| --------------- | ---------- | -------- | ------ |
| Voice input     | Editing    | 2025     | 4      |
| Diff review     | AI         | 2026     | 5      |
| Command palette | Navigation | 2024     | 5      |
| Callout blocks  | Editing    | 2025     | 4      |
| Task pane       | Editing    | 2024     | 3      |
| Slash menu      | AI         | 2025     | 5      |
| Inline calc()   | Editing    | 2026     | 5      |

Click any header — Feature, Category, Released, or Rating — to sort by that column. Click again to reverse the order.

## Callouts for anything that needs to stand out

> [!warning] Nothing leaves your machine
> AI features are hidden until you connect your own Anthropic or Google Gemini key. Without one, no note content is ever sent anywhere.

> [!info]- This one starts collapsed
> Click the title to expand it. Foldable callouts are handy for long asides you don't want cluttering the page by default.

## Or just talk

\`CTRL+SHIFT+V\` starts listening. Speech lands in an editable preview first — not straight into the note — so you can fix a mishear before it ever touches this file. Say "insert this," or just press Enter, to commit it at the cursor.

It's transcription, not formatting-by-voice: say "new paragraph" for a line break, "period" or "comma" for punctuation, "scratch that" to undo the last phrase. Everything else you say just becomes text, capitalized the way you'd expect.

## AI, only when you ask

AI is a chat box, connected to your own Anthropic or Google Gemini key — nothing more elaborate than that, and nothing runs until you've connected one.

---

That's HermesMarkdown: a plain-text writing surface, local-first by default, with AI as an optional layer you turn on — never the other way around.`;

export default function LandingPage() {
  const router = useRouter();
  const realContent = useAtomValue(atom_content);
  const [demoContent, setDemoContent] = useState(DEFAULT_DEMO_CONTENT);
  const [showLoading, setShowLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Real dictation, not a copy-only demo — same hook the actual /editor route
  // uses (use-global-voice-input.ts), writing into whichever CM6 view is
  // registered as active (atom_activeEditorView). That atom is only ever set
  // by MarkdownEditor (Source), never EditablePreview (Rendered) — true in
  // the real app too (see PaneLeaf.tsx) — so the mic only appears in Source
  // mode here.
  const {
    isVoiceSupported,
    isVoiceListening,
    toggleVoiceListening,
    voicePreviewText,
    setVoicePreviewText,
    voiceInterimText,
    commitVoicePreview,
    discardVoicePreview,
  } = useGlobalVoiceInput();

  // Ctrl/Cmd+Shift+V is also the browser's native "paste without formatting"
  // shortcut — without an explicit binding here it falls through to that
  // instead of toggling dictation, unlike the real /editor route (see its
  // own window keydown handler in page.tsx). MarkdownEditor is kept mounted
  // in both demo modes (see the render below), so this works the same in
  // Source and Rendered — no demoMode check needed here.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-voice-preview-panel]")) return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        if (isVoiceSupported) {
          e.preventDefault();
          toggleVoiceListening();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVoiceSupported, toggleVoiceListening]);

  useEffect(() => {
    setIsMounted(true);
    router.prefetch("/editor");
  }, [router]);

  const handleStart = () => {
    setShowLoading(true);
    router.push("/editor");
  };

  const tryItRef = useRef<HTMLElement>(null);
  const [tryItVisible, setTryItVisible] = useState(false);

  useEffect(() => {
    const el = tryItRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTryItVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasContent =
    realContent &&
    realContent.length > 0 &&
    realContent !== DEFAULT_DEMO_CONTENT;

  return (
    <main className="selection:bg-sage/30 overflow-x-hidden font-sans">
      <LoadingOverlay isVisible={showLoading} text="Opening editor..." />

      <Toast
        isVisible={isMounted && Boolean(hasContent)}
        icon={<FiFileText size={16} />}
        title="Welcome Back"
        description="You have a draft waiting in your local vault."
        actionLabel="Resume"
        onAction={handleStart}
      />

      {/* --- HERO SECTION --- */}
      <div className="relative pt-24 pb-20 md:pt-32 md:pb-24 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
          <div className="space-y-5 max-w-4xl animate-hero-fade-in">
            <div className="text-ui-footnote font-bold uppercase tracking-[0.3em] text-sage dark:text-sage">
              Hermes&middot;Markdown
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              A place where all you can do is write.
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              A Markdown editor that runs in your browser and saves straight
              to disk. No accounts, no cloud, nothing between you and the
              page.
            </p>
            <div className="pt-4 flex flex-col items-center justify-center gap-3">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button
                  variant="hero"
                  onClick={handleStart}
                  className="w-full sm:w-auto px-10"
                >
                  Open a Local Folder &amp; Write
                </Button>
                <Link
                  href="/documentation"
                  className="text-ui-callout font-semibold text-neutral-600 dark:text-neutral-400 hover:text-fg dark:hover:text-fg transition-colors inline-flex items-center gap-1.5 group"
                >
                  Read the docs
                  <span className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </div>
              <span className="text-ui-footnote text-neutral-500 dark:text-neutral-500">
                100% private. Runs entirely in your browser.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- TRY IT --- */}
      <section
        ref={tryItRef}
        className="px-6 pb-20 md:pb-32"
      >
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center space-y-10">
          <div
            className={`space-y-3 max-w-2xl opacity-0 [animation-fill-mode:forwards] ${tryItVisible ? "animate-hero-fade-in" : ""}`}
          >
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Try it. Right here.
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              No account, no install, no waiting. Type below — this is the
              real editor, running locally in this page.
            </p>
          </div>

          {/* INTERACTIVE EDITOR PREVIEW */}
          <div
            className={`w-full max-w-4xl relative group opacity-0 [animation-fill-mode:forwards] [animation-delay:150ms] ${tryItVisible ? "animate-hero-fade-in" : ""}`}
          >
            <div className="rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden ring-1 ring-black/5 dark:ring-white/5 transition-all duration-500 group-hover:ring-sage/20">
              <div className="h-10 bg-paper-light dark:bg-paper-dark border-b border-black/5 dark:border-white/10 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/20 border border-red-400/30" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/20 border border-amber-400/30" />
                  <div className="w-3 h-3 rounded-full bg-green-400/20 border border-green-400/30" />
                </div>
                <div className="flex-1 text-ui-footnote font-mono opacity-30 text-center pr-10 overflow-hidden text-ellipsis whitespace-nowrap">
                  landing_demo.md — hermes_vault
                </div>
                {isMounted && isVoiceSupported && (
                  <button
                    type="button"
                    onClick={toggleVoiceListening}
                    aria-label={isVoiceListening ? "Stop voice input" : "Start voice input"}
                    aria-pressed={isVoiceListening}
                    title="Voice input"
                    className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                      isVoiceListening
                        ? "text-sage bg-sage/10"
                        : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    }`}
                  >
                    {isVoiceListening ? <HiMicrophone size={14} /> : <HiOutlineMicrophone size={14} />}
                  </button>
                )}
                {/* Preview removed from demo — always show Source editor */}
              </div>
              <div className="h-[400px] md:h-[500px] text-left relative">
                {isMounted && (
                  <MarkdownEditor
                    value={demoContent}
                    onChange={setDemoContent}
                    isActivePane
                  />
                )}
                
              </div>
            </div>
          </div>
        </div>
      </section>

      {isMounted && (
        <VoicePreviewPanel
          isListening={isVoiceListening}
          previewText={voicePreviewText}
          onPreviewTextChange={setVoicePreviewText}
          interimText={voiceInterimText}
          onCommit={commitVoicePreview}
          onDiscard={() => {
            discardVoicePreview();
            if (isVoiceListening) toggleVoiceListening();
          }}
        />
      )}

      {isMounted && <MermaidDialog />}
      {isMounted && <ImageDialog />}

      {/* --- FEATURES --- */}
      <div className="max-w-5xl mx-auto px-6 py-24 md:py-32 space-y-32">

        {/* 1. Start fresh or open what you already have — the core hook,
            matches the hero's "runs in your browser, saves to disk" claim */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-teal-500" />
            <h2 className="text-3xl font-bold tracking-tight">
              Start fresh or open what you already have
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Open any existing local folder as a vault instantly — no
              migration, no conversion. Or create a new one: name it, pick a
              location, and start writing immediately. No example content, no
              setup wizard, no configuration to get through first.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Every note is a plain{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                .md
              </code>{" "}
              file with a small YAML header — title, status, tags. Nothing
              HermesMarkdown-specific, nothing you can&apos;t open in another
              editor or read in ten years.
            </p>
          </div>
          <div className="aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <FilesystemGraphic />
          </div>
        </section>

        {/* 2. Writing Experience */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div aria-hidden="true" className="order-last md:order-first aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <ZenModeGraphic />
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-purple-600" />
            <h2 className="text-3xl font-bold tracking-tight">
              Nothing but the page, until you ask for more
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Full-screen by default — no toolbar, no rail, no panel until you
              ask for one. The sidebar opens on hover or from the command
              palette; open files side by side, drag tabs between panes.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Type and watch it render: headings, code blocks with real
              syntax highlighting, diagrams, and math formulas all format
              live, in place — no extra editor mode to switch into.
            </p>
          </div>
        </section>

        {/* 3. Smart Syntax + Tables */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="h-px w-12 bg-amber-500" />
            <h2 className="text-3xl font-bold tracking-tight">
              Syntax that reacts, not just renders
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Stop wrestling with raw Markdown syntax or reaching for your
              mouse to format a simple table. This is a keyboard-first,
              ultra-responsive table editor built for effortless data
              structuring.
            </p>
            <ul className="space-y-2">
              {[
                {
                  label: "Flow-state navigation",
                  detail: "Navigate, edit, and reorganize entire cell grids entirely from your keyboard.",
                },
                {
                  label: "Smart native controls",
                  detail: "Toggle checkboxes instantly, pick dates with a native calendar, or Ctrl+Click any WikiLink to jump across your vault without breaking stride.",
                },
                {
                  label: "Dynamic status cycling",
                  detail: "Cycle tasks smoothly between #todo, #prog, and #done using native keyboard shortcuts.",
                },
                {
                  label: "Zero friction, zero lock-in",
                  detail: "Export to CSV anytime. Everything writes back directly to clean, auto-padded Markdown — rich, interactive tables that stay 100% future-proof.",
                },
              ].map(({ label, detail }) => (
                <li key={label} className="flex items-start gap-2 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  <span className="mt-2.5 w-1 h-1 rounded-full bg-neutral-400 dark:bg-neutral-500 shrink-0" />
                  <span>
                    <span className="font-semibold text-fg">{label}:</span> {detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div aria-hidden="true" className="aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <SmartSyntaxGraphic />
          </div>
        </section>

        {/* 4. BYO AI + Token awareness */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div aria-hidden="true" className="order-last md:order-first aspect-video bg-paper-light dark:bg-neutral-900 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center group overflow-hidden relative">
            <AIKeyGraphic />
          </div>
          <div className="space-y-6">
            <div className="h-px w-12 bg-indigo-600" />
            <h2 className="text-3xl font-bold tracking-tight">
              Bring your own keys
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Connect your Anthropic or Google Gemini API key. HermesMarkdown
              uses it to auto-generate{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                scope
              </code>{" "}
              fields, suggest{" "}
              <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                related
              </code>{" "}
              links, and improve your writing inline. Your keys stay in your
              browser — we never see them or proxy your requests.
            </p>
          </div>
        </section>

        {/* 5. Privacy */}
        <section className="space-y-10 text-center">
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="h-px w-12 bg-neutral-500 mx-auto" />
            <h2 className="text-3xl font-bold tracking-tight">
              No cloud. Your notes stay yours.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 max-w-4xl mx-auto text-left md:text-center">
            <div className="space-y-1.5">
              <p className="font-bold text-lg">Nothing uploaded.</p>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                No account or sync required — your vault is a folder on
                your disk.
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="font-bold text-lg">Nothing tracked.</p>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                No telemetry on note content, ever.
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="font-bold text-lg">Nothing proprietary.</p>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Plain <code className="text-[0.8em] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">.md</code> files, readable in any editor, forever.
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* --- CALL TO ACTION --- */}
      <section className="py-12 md:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8 bg-neutral-50 dark:bg-neutral-900/50 text-fg p-8 md:p-16 lg:p-24 rounded-[2rem] md:rounded-[3rem] border border-black/5 dark:border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sage/5 blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 blur-[100px] -ml-32 -mb-32" />

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight relative z-10">
            Open a folder. Start writing.
          </h2>
          <p className="opacity-60 max-w-xl mx-auto text-lg relative z-10 font-medium">
            A minimalist Markdown editor built for focus. Plain{" "}
            <code className="text-[0.85em] bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded not-italic">
              .md
            </code>{" "}
            files. Runs in your browser, saves to your machine.
          </p>
          <div className="pt-6 relative z-10 flex justify-center">
            <Button
              variant="hero"
              onClick={handleStart}
              className="transition-all"
            >
              Open Editor
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
