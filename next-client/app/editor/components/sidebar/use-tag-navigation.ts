"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { editorNoteFilterHref, editorTagHref, FILTER_PARAM, replaceUrlParam, TAG_PARAM } from "../../utils/editor-url";
import { PINNED_PAGES } from "./pinned-pages";
import { NOTE_FILTERS, type NoteFilter } from "../../tags/tag-index";

// Where the sidebar's filters and tags lead: the Tags page on one of them,
// rewritten in place when already there (as a pinned tag does). `tag` and
// `filter` are the current ones, for the highlighted row. Reads the URL, so
// it needs a Suspense boundary above it.
export function useTagNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onTags = pathname === PINNED_PAGES.tags.href;
  const tag = onTags ? searchParams?.get(TAG_PARAM) ?? null : null;
  const filterParam = onTags ? searchParams?.get(FILTER_PARAM) : null;
  const filter = !tag ? NOTE_FILTERS.find((candidate) => candidate === filterParam) ?? null : null;

  const openTag = useCallback((path: string) => {
    if (!onTags) return router.push(editorTagHref(path));
    replaceUrlParam(FILTER_PARAM, null);
    replaceUrlParam(TAG_PARAM, path);
  }, [onTags, router]);

  const openFilter = useCallback((next: NoteFilter) => {
    if (!onTags) return router.push(editorNoteFilterHref(next));
    replaceUrlParam(TAG_PARAM, null);
    replaceUrlParam(FILTER_PARAM, next);
  }, [onTags, router]);

  return { tag, filter, openTag, openFilter };
}
