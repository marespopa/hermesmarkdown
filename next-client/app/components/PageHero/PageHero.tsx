"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";

interface PageHeroProps {
  /** The headline's first part, in the page's ink. */
  title: string;
  /** The headline's last word(s), muted and italic: "Privacy" + "Policy." */
  accent?: string;
  /** The line under the headline. */
  intro: React.ReactNode;
  /** Shows the "← Back" button above the headline. */
  showBack?: boolean;
  /** Anything under the intro: a search field, an action. */
  children?: React.ReactNode;
  className?: string;
}

// Its own component so only pages with a Back button need the router.
function BackButton() {
  const router = useRouter();
  return (
    <Button
      variant="tertiary"
      onClick={() => router.back()}
      className="!text-ui-footnote uppercase tracking-[0.3em] opacity-40 hover:opacity-100 -ml-4"
    >
      ← Back
    </Button>
  );
}

// The opening of every public page (Documentation, Contact, Terms, Privacy):
// the same left-aligned headline, size, muted italic tail and intro, so the
// pages read as one site.
export default function PageHero({ title, accent, intro, showBack = false, children, className = "" }: PageHeroProps) {
  return (
    <section className={`space-y-8 animate-hero-fade-in ${className}`}>
      {showBack && <BackButton />}
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
        {title}
        {accent && (
          <>
            {" "}
            <span className="text-neutral-600 dark:text-neutral-400 italic">{accent}</span>
          </>
        )}
      </h1>
      <p className="text-lg md:text-2xl leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-3xl font-medium">
        {intro}
      </p>
      {children}
    </section>
  );
}
