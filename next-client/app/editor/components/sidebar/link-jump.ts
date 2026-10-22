import type { createStore } from "jotai";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_pendingScrollTarget } from "@/app/atoms/ui-atoms";
import { createLinkResolver } from "@/app/utils/note-links/link-resolver";
import { lineColumnAt, scanWikiLinks } from "@/app/utils/note-links/wikilink-scan";

type Store = ReturnType<typeof createStore>;

// After `source` is open: puts the caret on its first wikilink (outside
// code) that resolves to `targetPath`. Does nothing when there is none.
export function jumpToFirstLink(store: Store, source: string, targetPath: string): void {
  const text = store.get(atom_openFiles)[source]?.content;
  if (!text) return;
  const resolver = createLinkResolver(store.get(atom_fileMetadata));
  const occurrence = scanWikiLinks(text).find((occ) => resolver.resolve(occ.target, source)?.path === targetPath);
  if (!occurrence) return;
  store.set(atom_pendingScrollTarget, { path: source, ...lineColumnAt(text, occurrence.from) });
}
