import { DILLINGER_ALTERNATIVE } from "./dillinger-alternative";
import { OBSIDIAN_WEB_EDITOR } from "./obsidian-web-editor";
import { STACKEDIT_ALTERNATIVE } from "./stackedit-alternative";
import { TYPORA_FREE_ALTERNATIVE } from "./typora-free-alternative";
import type { AlternativeEntry } from "./types";

export { alternativePath, type AlternativeEntry } from "./types";

// The /alternatives pages, in hub order. The single source for the hub, the
// pages, the sitemap, the footer and llms.txt.
export const ALTERNATIVES: AlternativeEntry[] = [
  TYPORA_FREE_ALTERNATIVE,
  OBSIDIAN_WEB_EDITOR,
  DILLINGER_ALTERNATIVE,
  STACKEDIT_ALTERNATIVE,
];

export function alternativeBySlug(slug: string): AlternativeEntry | undefined {
  return ALTERNATIVES.find((entry) => entry.slug === slug);
}
