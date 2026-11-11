"use client";

import React from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { BareInput, FIELD_SURFACE } from "@/app/components/Input";
import PageHero from "@/app/components/PageHero/PageHero";

interface DocsHeroProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Matching articles while searching. */
  resultCount: number;
}

// The docs home's opening: the shared PageHero headline and one large search
// field that filters every article below it.
export default function DocsHero({ query, onQueryChange, resultCount }: DocsHeroProps) {
  const searching = query.trim() !== "";
  return (
    <PageHero
      className="pt-24 pb-16"
      title="How can we"
      accent="help?"
      intro={
        <>
          Everything HermesMarkdown does, feature by feature. Plain <code className="font-mono text-[0.85em]">.md</code> files,
          saved straight to your machine.
        </>
      }
    >
      <div className="relative max-w-xl">
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
          className={`${FIELD_SURFACE} w-full h-14 pl-14 pr-5 rounded-2xl text-ui-body`}
        />
      </div>
      {searching && (
        <p aria-live="polite" className="text-[15px] text-fg-muted">
          {resultCount === 0
            ? `No results for “${query.trim()}”.`
            : `${resultCount} ${resultCount === 1 ? "article" : "articles"} found`}
        </p>
      )}
    </PageHero>
  );
}
