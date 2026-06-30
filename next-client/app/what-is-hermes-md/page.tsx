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
              What is a{" "}
              <span className="text-neutral-400 dark:text-neutral-600 italic font-serif">hermes.md</span>{" "}
              file?
            </h1>
          </div>
          <p className="text-lg md:text-xl leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-2xl font-medium">
            A plain-language explanation of the <InlineCode>hermes.md</InlineCode> /{" "}
            <InlineCode>.hermes.md</InlineCode> convention — and how it relates, or doesn&apos;t, to HermesMarkdown.
          </p>
        </section>

        {/* What it actually is */}
        <section className="space-y-6 border-t border-black/5 dark:border-white/10 pt-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">The hermes.md convention</h2>
          <div className="space-y-5 text-neutral-500 dark:text-neutral-400 leading-relaxed text-base md:text-lg">
            <p>
              <InlineCode>hermes.md</InlineCode> and <InlineCode>.hermes.md</InlineCode> are project-context
              filenames associated with <strong className="text-ink-light dark:text-ink-dark font-semibold">Hermes Agent</strong>{" "}
              (a model from NousResearch) and compatible AI coding tools. The file sits in a code repository
              and gives the agent a structured description of the codebase — folder layout, key conventions,
              where things live — so it doesn&apos;t have to infer structure from the source alone.
            </p>
            <p>It serves the same conceptual purpose as several other agent-context file conventions:</p>
            <ul className="space-y-2 list-disc list-outside pl-5 marker:text-sage">
              <li><InlineCode>AGENTS.md</InlineCode> — used by OpenAI Codex and some other tools</li>
              <li><InlineCode>CLAUDE.md</InlineCode> — Claude Code&apos;s project-context convention</li>
              <li><InlineCode>.cursorrules</InlineCode> — used by Cursor</li>
              <li><InlineCode>.github/copilot-instructions.md</InlineCode> — GitHub Copilot</li>
            </ul>
            <p>
              The idea in each case is the same: a human-maintained file the agent reads on startup, so it
              starts with project context rather than a blank slate.
            </p>
            <div className="p-5 border border-black/5 dark:border-white/5 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/30 text-sm leading-relaxed">
              <span className="block text-ui-footnote uppercase tracking-[0.2em] font-bold mb-2 opacity-60">Note</span>
              The <InlineCode>hermes.md</InlineCode> and <InlineCode>.hermes.md</InlineCode> convention is not
              created, owned, or used by HermesMarkdown. Hermes Agent (NousResearch) and this editor share
              the Hermes name but are unrelated projects.
            </div>
          </div>
        </section>

        {/* Why interest spiked */}
        <section className="space-y-5 border-t border-black/5 dark:border-white/10 pt-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Why search interest spiked</h2>
          <div className="space-y-4 text-neutral-500 dark:text-neutral-400 leading-relaxed text-base md:text-lg">
            <p>
              In mid-2025, a billing discrepancy in Claude Code was traced to a third-party harness that was
              incorrectly treating <InlineCode>.hermes.md</InlineCode> as a special always-loaded context file,
              causing unexpected token usage on every request. The incident drew attention to the filename
              convention, and search interest in "hermes.md file" increased sharply as developers tried to
              understand what the file was and whether they had one in their repos.
            </p>
          </div>
        </section>

        {/* Bridge to HermesMarkdown */}
        <section className="space-y-6 border-t border-black/5 dark:border-white/10 pt-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            A related idea you might actually be looking for
          </h2>
          <div className="space-y-5 text-neutral-500 dark:text-neutral-400 leading-relaxed text-base md:text-lg">
            <p>
              If what you&apos;re actually looking for isn&apos;t Hermes Agent itself but rather a way to keep a
              human-edited knowledge base in sync with what an agent reads, that&apos;s what HermesMarkdown is
              built for — though it works differently from the single-file convention.
            </p>
            <p>
              Instead of one <InlineCode>hermes.md</InlineCode> file, HermesMarkdown generates a{" "}
              <InlineCode>.hermes/</InlineCode> folder inside any vault you open. The folder holds:
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
              The design uses a three-tier read protocol: filter by <InlineCode>read_when</InlineCode>, load
              scope only, then full file content only when necessary. The goal is the same as any
              agent-context convention — keep what the agent reads in sync with what a human actually wrote —
              but distributed across a structured vault rather than packed into a single file.
            </p>
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
