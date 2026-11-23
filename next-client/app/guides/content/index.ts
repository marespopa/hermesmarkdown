import { EDIT_OBSIDIAN_VAULT_IN_BROWSER } from "./edit-obsidian-vault-in-browser";
import { LOCAL_LLM_OLLAMA_MARKDOWN_EDITOR } from "./local-llm-ollama-markdown-editor";
import { OFFLINE_MARKDOWN_EDITOR_CHROMEBOOK } from "./offline-markdown-editor-chromebook";
import type { GuideEntry } from "./types";

export { guideHeadline, guidePath, type GuideEntry } from "./types";

// The /guides pages, in hub order. The single source for the hub, the pages,
// the sitemap, the footer and llms.txt.
export const GUIDES: GuideEntry[] = [
  EDIT_OBSIDIAN_VAULT_IN_BROWSER,
  OFFLINE_MARKDOWN_EDITOR_CHROMEBOOK,
  LOCAL_LLM_OLLAMA_MARKDOWN_EDITOR,
];

export function guideBySlug(slug: string): GuideEntry | undefined {
  return GUIDES.find((entry) => entry.slug === slug);
}
