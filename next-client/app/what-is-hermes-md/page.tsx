"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[0.85em] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono text-ink-light dark:text-ink-dark not-italic">
      {children}
    </code>
  );
}

const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-sage/[0.05] dark:bg-sage/[0.03] blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] dark:bg-purple-500/[0.02] rounded-full blur-[100px]" />
    <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-[120px]" />
  </div>
);

export default function WhatIsHermesMd() {
  const router = useRouter();

  return (
    <main className="selection:bg-sage/30 overflow-x-hidden font-sans relative">
      <BackgroundGraphics />
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-32 space-y-20">

        {/* Header */}
        <section className="space-y-8 animate-hero-fade-in">
          <Button
            variant="tertiary"
            onClick={() => router.back()}
            className="!text-ui-footnote uppercase tracking-[0.3em] opacity-40 hover:opacity-100 -ml-4"
          >
            ← Back
          </Button>
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              Is <span className="text-neutral-600 dark:text-neutral-400 italic font-serif">HermesMarkdown</span>{" "}
              the same as Hermes Agent?
            </h1>
          </div>
          <p className="text-lg md:text-xl leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-2xl font-medium">
            No. HermesMarkdown is a browser-based Markdown editor. Hermes Agent is a separate AI agent
            project that uses files like <InlineCode>SOUL.md</InlineCode> and <InlineCode>memory.md</InlineCode>.
            They share a name and nothing else — here&apos;s the actual difference.
          </p>
        </section>

        {/* What HermesMarkdown is */}
        <section className="space-y-6 border-t border-black/5 dark:border-white/10 pt-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">HermesMarkdown, in one sentence</h2>
          <div className="space-y-5 text-neutral-500 dark:text-neutral-400 leading-relaxed text-base md:text-lg">
            <p>
              <strong className="text-ink-light dark:text-ink-dark font-semibold">HermesMarkdown is a
              Markdown editor that runs entirely in your browser and reads/writes files directly on your
              local disk.</strong>{" "}
              There&apos;s no account, no cloud sync, and no server in the middle — you open a folder of{" "}
              <InlineCode>.md</InlineCode> files (including an existing Obsidian vault, if you have one) and
              edit it in place. It has no relationship to any AI agent&apos;s memory system.
            </p>
          </div>
        </section>

        {/* What Hermes Agent's markdown files are */}
        <section className="space-y-6 border-t border-black/5 dark:border-white/10 pt-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">What Hermes Agent&apos;s markdown files are</h2>
          <div className="space-y-5 text-neutral-500 dark:text-neutral-400 leading-relaxed text-base md:text-lg">
            <p>
              <strong className="text-ink-light dark:text-ink-dark font-semibold">Hermes Agent</strong>{" "}
              (from NousResearch) is an unrelated AI agent project. It stores agent memory, personas, and
              plans in specific markdown files:
            </p>
            <ul className="space-y-2 list-disc list-outside pl-5 marker:text-sage">
              <li><InlineCode>SOUL.md</InlineCode> — custom personality/behavior definitions for the agent</li>
              <li><InlineCode>memory.md</InlineCode> — persistent memory and context the agent stores across sessions</li>
              <li>Plan-mode markdown files — structured goals, assumptions, and steps the agent generates before executing changes</li>
              <li><InlineCode>hermes.md</InlineCode> / <InlineCode>.hermes.md</InlineCode> — project-context filenames used by Hermes Agent and compatible tools, similar in purpose to <InlineCode>AGENTS.md</InlineCode> or <InlineCode>CLAUDE.md</InlineCode></li>
            </ul>
            <p>
              None of these are created, read, or required by HermesMarkdown. HermesMarkdown doesn&apos;t
              define special filenames at all — it edits whatever Markdown already exists in the folder
              you open, whether that&apos;s an Obsidian vault, a docs folder, or a plain notes directory.
            </p>
            <div className="p-5 border border-black/5 dark:border-white/5 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/30 text-sm leading-relaxed">
              <span className="block text-ui-footnote uppercase tracking-[0.2em] font-bold mb-2 opacity-60">Note</span>
              Hermes Agent (NousResearch) and HermesMarkdown are unrelated projects that happen to share
              the Hermes name. If you landed here looking for SOUL.md, memory.md, or plan-mode setup, this
              isn&apos;t that — you likely want Hermes Agent&apos;s own documentation.
            </div>
          </div>
        </section>

        {/* Bridge to HermesMarkdown's actual agent-context feature */}
        <section className="space-y-6 border-t border-black/5 dark:border-white/10 pt-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            If you&apos;re looking for agent-readable notes
          </h2>
          <div className="space-y-5 text-neutral-500 dark:text-neutral-400 leading-relaxed text-base md:text-lg">
            <p>
              If what you actually want is a way to keep a human-edited knowledge base in sync with what
              an AI agent reads, HermesMarkdown does have a feature for that — though it works differently
              from Hermes Agent&apos;s single-file memory convention.
            </p>
            <p>
              Instead of one memory file, HermesMarkdown generates a <InlineCode>.hermes/</InlineCode> folder
              inside any vault you open. The folder holds:
            </p>
            <ul className="space-y-3 list-disc list-outside pl-5 marker:text-sage">
              <li>
                <InlineCode>AGENTS.md</InlineCode> — a generated, agent-facing document that describes the
                vault&apos;s frontmatter schema and file tree. An agent reads this first rather than scanning
                all your notes individually.
              </li>
              <li>
                <InlineCode>index.yaml</InlineCode> — a flat index of every note&apos;s frontmatter (
                <InlineCode>scope</InlineCode>, <InlineCode>read_when</InlineCode>, title, status) with no
                file body content — so an agent can skim hundreds of notes without opening them.
              </li>
              <li>
                <InlineCode>schema.yaml</InlineCode> — the vault&apos;s frontmatter schema, editable from
                the editor&apos;s settings panel.
              </li>
            </ul>
            <p>
              See{" "}
              <Link href="/documentation#hermes-architecture" className="text-sage font-semibold hover:underline">
                .hermes/ architecture
              </Link>{" "}
              and{" "}
              <Link href="/documentation#agent-context-protocol" className="text-sage font-semibold hover:underline">
                Agent context protocol
              </Link>{" "}
              in the documentation for the full mechanics.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-black/5 dark:border-white/10 pt-16 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/editor"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-sage text-white font-semibold rounded-full hover:bg-sage/90 transition-colors text-sm"
            >
              Try the editor
            </Link>
            <Link
              href="/documentation#hermes-architecture"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-black/10 dark:border-white/10 font-semibold rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-sm text-ink-light dark:text-ink-dark"
            >
              Read the agent-context docs
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
