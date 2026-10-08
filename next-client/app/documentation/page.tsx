"use client";

import React, { useEffect, useMemo, useState } from "react";
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";
import type { Subsection } from "./doc-primitives";
import { GROUPS } from "./content";
import DocsHero from "./components/DocsHero";
import DocsLocalNav from "./components/DocsLocalNav";
import DocsSidebar from "./components/DocsSidebar";
import TopicCards from "./components/TopicCards";

// The system UI font first (SF Pro on Apple devices), the app's Inter after.
const DOCS_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", var(--font-inter), system-ui, sans-serif';
const LOCAL_NAV_HEIGHT = 48;

// Article body typography, applied to whatever the content modules render.
const ARTICLE_BODY = [
  "space-y-5 text-[17px] leading-[1.6] text-fg",
  "[&_p]:break-words",
  "[&_h4]:text-[19px] [&_h4]:font-semibold [&_h4]:tracking-tight [&_h4]:text-fg",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_li]:break-words [&_li]:pl-1",
  "[&_strong]:font-semibold",
  "[&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.88em] [&_:not(pre)>code]:bg-chrome [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:rounded-md",
].join(" ");

function matchesQuery(item: Subsection, q: string) {
  return !q || `${item.title} ${item.lead} ${item.keywords ?? ""}`.toLowerCase().includes(q);
}

// Measures the sticky site header so the docs bar can stick right under it.
function useSiteHeaderHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-testid="GlobalHeader"]');
    if (!header) return;
    const update = () => setHeight(header.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return height;
}

export default function Documentation() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("");
  const [contentsOpen, setContentsOpen] = useState(false);
  const headerHeight = useSiteHeaderHeight();
  const stickyTop = headerHeight + LOCAL_NAV_HEIGHT;

  const q = query.trim().toLowerCase();
  const visibleGroups = useMemo(
    () => GROUPS.map((g) => ({ ...g, items: g.items.filter((item) => matchesQuery(item, q)) })).filter((g) => g.items.length > 0),
    [q],
  );
  const resultCount = visibleGroups.reduce((sum, g) => sum + g.items.length, 0);
  const activeGroupId = GROUPS.find((g) => g.items.some((item) => item.id === activeId))?.id ?? "";

  // The article whose top has passed under the sticky bars is the one in view.
  useEffect(() => {
    const ids = visibleGroups.flatMap((g) => g.items.map((item) => item.id)).reverse();
    const handleScroll = () => {
      const current = ids.find((id) => {
        const el = document.getElementById(id);
        return el && el.getBoundingClientRect().top <= stickyTop + 24;
      });
      setActiveId(current ?? "");
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visibleGroups, stickyTop]);

  return (
    <div
      id="top"
      className="relative overflow-x-clip selection:bg-sage/30"
      style={{ fontFamily: DOCS_FONT, ["--docs-sticky-top" as string]: `${stickyTop}px` }}
    >
      <DocsLocalNav
        groups={GROUPS}
        activeGroupId={activeGroupId}
        top={headerHeight}
        onOpenContents={() => setContentsOpen(true)}
      />

      <OverlayPanel
        isOpen={contentsOpen}
        onClose={() => setContentsOpen(false)}
        variant="sheet"
        backdrop="dim"
        ariaLabelledBy="docs-contents-title"
        containerClassName="justify-end lg:hidden"
        panelClassName="max-h-[80vh] overflow-y-auto rounded-t-[22px] bg-surface px-3 pb-8 pt-3 animate-in slide-in-from-bottom duration-overlay-panel"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-edge" aria-hidden="true" />
        <h2 id="docs-contents-title" className="px-3 pb-4 text-[17px] font-semibold text-fg">Contents</h2>
        <DocsSidebar groups={visibleGroups} activeId={activeId} onNavigate={() => setContentsOpen(false)} />
      </OverlayPanel>

      <div className="container max-w-screen-xl">
        <DocsHero query={query} onQueryChange={setQuery} resultCount={resultCount} />
        {!q && (
          <div className="pb-20 sm:pb-28">
            <TopicCards groups={GROUPS} />
          </div>
        )}

        <div className="flex items-start gap-12 xl:gap-20 pb-24 lg:pb-32">
          <aside className="hidden lg:block w-60 shrink-0 sticky top-[calc(var(--docs-sticky-top)_+_2rem)] max-h-[calc(100vh_-_var(--docs-sticky-top)_-_3rem)] overflow-y-auto pb-6">
            <DocsSidebar groups={visibleGroups} activeId={activeId} />
          </aside>

          <div className="flex-1 min-w-0 max-w-[720px] space-y-20 lg:space-y-24">
            {visibleGroups.map((group) => (
              <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} className="scroll-mt-[calc(var(--docs-sticky-top)_+_1.5rem)]">
                <header className="pb-8 border-b border-edge-subtle">
                  <h2 id={`${group.id}-title`} className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.025em] leading-tight text-fg">
                    {group.label}
                  </h2>
                  {group.summary && <p className="mt-2 text-[19px] leading-snug text-fg-muted">{group.summary}</p>}
                </header>

                {group.items.map((item) => (
                  <article
                    key={item.id}
                    id={item.id}
                    className="scroll-mt-[calc(var(--docs-sticky-top)_+_1.5rem)] py-10 border-b border-edge-subtle last:border-none"
                  >
                    <h3 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.015em] leading-tight text-fg">{item.title}</h3>
                    <p className="mt-3 text-[19px] leading-[1.45] text-fg-muted">{item.lead}</p>
                    <div className={`mt-6 ${ARTICLE_BODY}`}>{item.body}</div>
                  </article>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
