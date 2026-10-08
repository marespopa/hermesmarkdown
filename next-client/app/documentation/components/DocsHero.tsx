"use client";

import React from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { BareInput } from "@/app/components/Input";

interface DocsHeroProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Matching articles while searching. */
  resultCount: number;
}

// The docs home's opening: a centred question and one large search field
// that filters every article below it.
export default function DocsHero({ query, onQueryChange, resultCount }: DocsHeroProps) {
  const searching = query.trim() !== "";
  return (
    <section className="text-center pt-14 pb-12 sm:pt-24 sm:pb-16 animate-hero-fade-in">
      <p className="text-[17px] font-semibold text-fg-muted">HermesMarkdown Documentation</p>
      <h1 className="mt-2 text-[40px] sm:text-[56px] font-semibold tracking-[-0.03em] leading-[1.07] text-fg">
        How can we help?
      </h1>
      <p className="mt-4 mx-auto max-w-2xl text-[19px] sm:text-[21px] leading-snug text-fg-muted">
        Everything HermesMarkdown does, feature by feature. Plain <code className="font-mono text-[0.85em]">.md</code> files,
        saved straight to your machine.
      </p>
      <div className="relative mt-10 mx-auto max-w-xl">
        <HiOutlineSearch
          size={20}
          aria-hidden="true"
          className="absolute left-5 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none"
        />
        <BareInput
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search documentation"
          aria-label="Search documentation"
          className="w-full h-14 pl-14 pr-5 text-[17px] text-fg placeholder:text-fg-faint bg-surface-raised border border-edge rounded-full shadow-sm outline-none focus:border-accent transition-colors"
        />
      </div>
      {searching && (
        <p aria-live="polite" className="mt-4 text-[15px] text-fg-muted">
          {resultCount === 0
            ? `No results for “${query.trim()}”.`
            : `${resultCount} ${resultCount === 1 ? "article" : "articles"} found`}
        </p>
      )}
    </section>
  );
}
