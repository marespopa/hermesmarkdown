// app/workers/metadata.worker.ts
import { parseFmFields } from "@/app/utils/frontmatter-utils";
import { extractTasks } from "@/app/utils/taskExtractor";
import { notePreview } from "@/app/utils/markdown-preview";

const REGEX_TAG = /(?<=^|\s)#(?=[a-zA-Z0-9_\-/]*[a-zA-Z])([a-zA-Z0-9_\-/]+)/g;
const REGEX_LINK = /\[\[(.*?)\]\]/g;
const REGEX_FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^["']|["']$/g, "").replace(/^#/, "").toLowerCase();
}

function parseFrontmatterTags(fmContent: string): string[] {
  const inlineMatch = fmContent.match(/^tags:\s*\[(.*?)\]/m);
  if (inlineMatch) {
    return inlineMatch[1]
      .split(",")
      .map(normalizeTag)
      .filter(Boolean);
  }
  const lines = fmContent.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^tags:\s*$/.test(l));
  if (idx !== -1) {
    const result: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const m = lines[i].match(/^\s*-\s+(.+)/);
      if (m) result.push(normalizeTag(m[1]));
      else break;
    }
    return result;
  }
  return [];
}

self.onmessage = (event: MessageEvent) => {
  // Expects array of { path, name, content, modifiedAt } — content pre-read in main thread
  const { files } = event.data;

  if (!files || !Array.isArray(files)) return;

  const results = [];

  for (const fileInfo of files) {
    try {
      const { path, name, content, modifiedAt } = fileInfo;

      // Frontmatter Extraction — reuses parseFmFields so Obsidian-style block
      // lists (e.g. `related:\n  - "[[Note]]"`) are captured for every field,
      // not just `tags` which has its own dedicated parser below.
      const fmMatch = content.match(REGEX_FRONTMATTER);
      const frontmatter: Record<string, any> = fmMatch ? parseFmFields(content) : {};

      // Tag Extraction: frontmatter tags + inline #hashtags from body only
      const fmTags = fmMatch ? parseFrontmatterTags(fmMatch[1]) : [];
      const bodyContent = fmMatch ? content.slice(fmMatch[0].length) : content;
      const tagMatches = Array.from(bodyContent.matchAll(REGEX_TAG));
      const inlineTags = tagMatches.map((m: any) => m[1].toLowerCase());
      const tags = Array.from(new Set([...fmTags, ...inlineTags]));

      // Title fallback: frontmatter title -> first H1 in body -> filename
      if (!frontmatter.title) {
        const h1Match = bodyContent.match(/^#\s+(.+)$/m);
        if (h1Match) frontmatter.title = h1Match[1].trim();
      }

      // Wiki Link Extraction
      const linkMatches = Array.from(content.matchAll(REGEX_LINK));
      const links = Array.from(new Set(linkMatches.map((m: any) => m[1].trim())));

      // Metrics
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

      // Task Extraction: checklist items anywhere in the file, with an
      // optional inline #prog tag (see app/utils/taskExtractor.ts)
      const tasks = extractTasks(path, content);

      // Plain-text excerpt for the home feed
      const preview = notePreview(content);

      results.push({ path, name, tags, links, frontmatter, modifiedAt, wordCount, tasks, preview });
    } catch (err: any) {
      console.error(`Worker error processing file (${fileInfo.path}):`, err?.message || err);
    }
  }

  // `requestId` lets the vault indexer match results to its request
  // (parseWithWorker); the active-file re-indexer posts without one.
  self.postMessage({ results, requestId: event.data.requestId });
};
