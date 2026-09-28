"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineMenu, HiOutlineX, HiOutlineSearch, HiOutlineHome, HiOutlinePencilAlt } from "react-icons/hi";
import Button from "@/app/components/Button/Button.component";
import type { Subsection } from "./doc-primitives";
import { GROUPS } from "./content";
import { BareInput } from "@/app/components/Input";

const ALL_IDS = GROUPS.flatMap((g) => g.items.map((i) => i.id));

/* ── Background graphics (kept from the previous page) ───────────────── */

const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-neutral-500/[0.03] dark:bg-neutral-400/[0.02] blur-[120px]" />
  </div>
);

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function Documentation() {
  const router = useRouter();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setScrollProgress(scrollHeight > 0 ? scrollTop / scrollHeight : 0);

      for (const id of [...ALL_IDS].reverse()) {
        const target = document.getElementById(id);
        if (target && target.getBoundingClientRect().top <= 120) {
          setActiveId(id);
          return;
        }
      }
      setActiveId("");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const q = query.trim().toLowerCase();

  const matches = (item: Subsection) => {
    if (!q) return true;
    const haystack = `${item.title} ${item.lead} ${item.keywords || ""}`.toLowerCase();
    return haystack.includes(q);
  };

  const visibleGroups = useMemo(
    () => GROUPS.map((g) => ({ ...g, items: g.items.filter(matches) })).filter((g) => g.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q],
  );

  const navLinkClasses = (id: string) =>
    `block text-ui-subhead font-medium py-1.5 px-3 rounded-lg transition-all duration-200 ${activeId === id
      ? "text-sage dark:text-sage bg-blue-50 dark:bg-sage/10"
      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
    }`;

  const navContent = (
    <nav className="space-y-6 w-full" aria-label="Table of contents">
      <div className="relative">
        <HiOutlineSearch
          size={14}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone pointer-events-none"
        />
        <BareInput
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs…"
          autoComplete="off"
          aria-label="Search documentation"
          className="w-full h-9 pl-8 pr-3 text-ui-footnote bg-paper-light dark:bg-paper-dark-surface/50 border border-edge rounded-full outline-none focus:ring-2 focus:ring-sage/20 text-ink-light dark:text-ink-dark placeholder:text-stone"
        />
      </div>

      {visibleGroups.map((g) => (
        <div key={g.id} className="space-y-1">
          <span className="block text-ui-callout font-bold tracking-tight text-ink-light dark:text-ink-dark px-3 mb-2">
            {g.label}
          </span>
          {g.items.map((item) => (
            <a key={item.id} href={`#${item.id}`} onClick={() => setMobileNavOpen(false)} className={navLinkClasses(item.id)}>
              {item.title}
            </a>
          ))}
        </div>
      ))}

      {q && visibleGroups.length === 0 && (
        <p className="text-ui-footnote text-stone px-3 italic">No matches for &quot;{query}&quot;.</p>
      )}
    </nav>
  );

  return (
    <main className="selection:bg-sage/30 overflow-x-clip font-sans relative">
      <div
        className="fixed top-0 left-0 h-px bg-neutral-400 dark:bg-neutral-600 z-50 transition-all duration-75"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      <BackgroundGraphics />

      {/* Persistent navigation — always reachable, regardless of scroll position */}
      <div className="fixed top-4 right-4 sm:right-6 z-40 flex items-center gap-1 p-1 rounded-full bg-surface/90 dark:bg-paper-dark/90 backdrop-blur-xl border border-edge shadow-lg">
        <Link
          href="/"
          aria-label="Go to homepage"
          className="w-10 h-10 rounded-full flex items-center justify-center text-fg-muted hover:text-sage hover:bg-sage/10 transition-colors"
        >
          <HiOutlineHome size={18} />
        </Link>
        <Link
          href="/editor"
          aria-label="Go to editor"
          className="w-10 h-10 rounded-full flex items-center justify-center text-fg-muted hover:text-sage hover:bg-sage/10 transition-colors"
        >
          <HiOutlinePencilAlt size={18} />
        </Link>
      </div>

      {/* Mobile nav toggle */}
      <Button variant="unstyled"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open table of contents"
        className="lg:hidden fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-sage text-white flex items-center justify-center shadow-lg"
      >
        <HiOutlineMenu size={20} />
      </Button>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full bg-surface dark:bg-paper-dark overflow-y-auto p-5">
            <Button variant="unstyled"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close table of contents"
              className="absolute top-4 right-4 text-stone"
            >
              <HiOutlineX size={20} />
            </Button>
            <div className="mt-10">
              {navContent}
            </div>
          </div>
        </div>
      )}

      <div className="container pt-20 lg:pt-32 pb-20 lg:pb-32 flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">

        <aside className="hidden lg:flex w-52 xl:w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto p-1.5">
          {navContent}
        </aside>

        <div className="flex-1 min-w-0 w-full space-y-20 lg:space-y-24">

          <section className="space-y-8 animate-hero-fade-in">
            <Button
              variant="tertiary"
              onClick={() => router.back()}
              className="!text-ui-footnote uppercase tracking-[0.3em] opacity-40 hover:opacity-100 -ml-4"
            >
              ← Back
            </Button>
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl md:text-8xl font-bold tracking-tight leading-[1.05]">
                Product{" "}
                <span className="text-neutral-600 dark:text-neutral-400 italic font-serif">Documentation.</span>
              </h1>
            </div>
            <p className="text-lg md:text-2xl leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-3xl font-medium">
              How HermesMarkdown works, feature by feature. Plain <code className="text-[0.75em] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono not-italic">.md</code> files, a minimalist writing surface, and optional AI assistance when you want it. No account needed, saves straight to your machine.
            </p>
          </section>

          {visibleGroups.map((group) => (
            <section key={group.id} className="space-y-10 lg:space-y-12 border-t border-black/5 dark:border-white/10 pt-16 lg:pt-20">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{group.label}</h2>

              <div className="space-y-14 lg:space-y-16">
                {group.items.map((item) => {
                  const highlight = q && matches(item);
                  return (
                    <article
                      key={item.id}
                      id={item.id}
                      className={`scroll-mt-24 space-y-4 max-w-3xl rounded-2xl transition-all ${highlight ? "ring-2 ring-sage/30 bg-sage/[0.03] -mx-2 px-2 sm:-mx-4 sm:px-4 py-4" : ""
                        }`}
                    >
                      <h3 className="text-lg md:text-xl font-medium tracking-tight">{item.title}</h3>
                      <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">{item.lead}</p>
                      <div className="space-y-5 [&_h4]:text-lg [&_h4]:font-bold [&_h4]:tracking-tight [&_p]:text-neutral-500 [&_p]:dark:text-neutral-400 [&_p]:leading-relaxed [&_p]:text-base [&_p]:break-words [&_li]:break-words">
                        {item.body}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

        </div>
      </div>
    </main>
  );
}
