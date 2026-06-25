"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";

const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-sage/[0.05] dark:bg-sage/[0.03] blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] dark:bg-purple-500/[0.02] rounded-full blur-[100px]" />
    <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-[120px]" />
  </div>
);

export type RelatedLink = { href: string; label: string };

export function DocPageLayout({
  cluster,
  clusterHref,
  title,
  summary,
  children,
  related,
}: {
  cluster: string;
  clusterHref: string;
  title: string;
  summary: string;
  children: ReactNode;
  related: RelatedLink[];
}) {
  const router = useRouter();

  return (
    <main className="selection:bg-sage/30 overflow-x-clip font-sans relative">
      <BackgroundGraphics />

      <div className="max-w-3xl mx-auto px-6 pt-20 lg:pt-28 pb-20 lg:pb-32 space-y-16">
        <section className="space-y-6 animate-hero-fade-in">
          <Button
            variant="tertiary"
            onClick={() => router.back()}
            className="!text-ui-footnote uppercase tracking-[0.3em] opacity-40 hover:opacity-100 -ml-4"
          >
            ← Back
          </Button>

          <div className="space-y-3">
            <Link
              href={clusterHref}
              className="text-ui-footnote uppercase tracking-[0.3em] font-bold text-sage dark:text-sage hover:opacity-70"
            >
              {cluster}
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
              {title}
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-neutral-500 dark:text-neutral-400 font-medium">
              {summary}
            </p>
          </div>
        </section>

        <section className="space-y-12 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:tracking-tight [&_h3]:mb-3 [&_p]:text-neutral-500 [&_p]:dark:text-neutral-400 [&_p]:leading-relaxed [&_p]:text-base [&_p]:md:text-lg">
          {children}
        </section>

        <section className="pt-10 border-t border-black/5 dark:border-white/10 space-y-3">
          <span className="text-ui-footnote uppercase tracking-[0.3em] font-bold opacity-30 block">
            Related
          </span>
          <ul className="flex flex-wrap gap-x-8 gap-y-2">
            {related.map((r) => (
              <li key={r.href}>
                <Link
                  href={r.href}
                  className="text-sage dark:text-sage font-medium hover:underline underline-offset-4"
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

export function DocKeyValueTable({ rows }: { rows: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex justify-between border-b border-black/5 dark:border-white/5 py-4 last:border-none items-center gap-4"
        >
          <span className="text-sm font-medium">{r.label}</span>
          <span className="opacity-40 italic text-right text-ui-footnote uppercase tracking-wider font-bold">
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DocShortcutGroup({
  groups,
}: {
  groups: { context: string; rows: { label: string; shortcut: string }[] }[];
}) {
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <div key={g.context} className="space-y-3">
          <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.4em]">{g.context}</h3>
          <DocKeyValueTable rows={g.rows.map((r) => ({ label: r.label, value: r.shortcut }))} />
        </div>
      ))}
    </div>
  );
}

export function DocCode({ children }: { children: ReactNode }) {
  return (
    <pre className="p-5 bg-neutral-900 dark:bg-black/40 text-neutral-100 rounded-2xl overflow-x-auto font-mono text-sm leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

export function DocCallout({
  type = "note",
  children,
}: {
  type?: "note" | "warning" | "tip";
  children: ReactNode;
}) {
  const styles = {
    note: "bg-blue-500/5 dark:bg-blue-900/10 border-blue-500/10 text-blue-700 dark:text-blue-400/80",
    warning: "bg-amber-500/5 dark:bg-amber-900/10 border-amber-500/10 text-amber-700 dark:text-amber-400/70",
    tip: "bg-emerald-500/5 dark:bg-emerald-900/10 border-emerald-500/10 text-emerald-700 dark:text-emerald-400/80",
  };
  const labels = { note: "Note", warning: "Warning", tip: "Tip" };

  return (
    <div className={`p-5 border rounded-2xl text-sm leading-relaxed ${styles[type]}`}>
      <span className="block text-ui-footnote uppercase tracking-[0.2em] font-bold mb-2 opacity-80">
        {labels[type]}
      </span>
      {children}
    </div>
  );
}

export function DocScreenshot({ label }: { label: string }) {
  return (
    <div className="aspect-video w-full rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center justify-center text-ui-footnote uppercase tracking-[0.2em] font-bold opacity-30">
      [screenshot — {label}]
    </div>
  );
}
