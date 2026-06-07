// app/workers/metadata.worker.ts

const REGEX_TAG = /(?<=^|\s)#(?=[a-zA-Z0-9_\-/]*[a-zA-Z])([a-zA-Z0-9_\-/]+)/g;
const REGEX_LINK = /\[\[(.*?)\]\]/g;
const REGEX_FRONTMATTER = /^---\n([\s\S]*?)\n---/;

function parseFrontmatterTags(fmContent: string): string[] {
  const inlineMatch = fmContent.match(/^tags:\s*\[(.*?)\]/m);
  if (inlineMatch) {
    return inlineMatch[1]
      .split(",")
      .map((t) => t.trim().replace(/^["']|["']$/g, "").toLowerCase())
      .filter(Boolean);
  }
  const lines = fmContent.split("\n");
  const idx = lines.findIndex((l) => /^tags:\s*$/.test(l));
  if (idx !== -1) {
    const result: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const m = lines[i].match(/^\s*-\s+(.+)/);
      if (m) result.push(m[1].trim().replace(/^["']|["']$/g, "").toLowerCase());
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

      // Frontmatter Extraction
      const frontmatter: Record<string, any> = {};
      const fmMatch = content.match(REGEX_FRONTMATTER);
      if (fmMatch) {
        const fmContent = fmMatch[1];
        const lines = fmContent.split("\n");
        for (const line of lines) {
          if (/^\s*-\s+/.test(line)) continue;
          const colonIndex = line.indexOf(":");
          if (colonIndex !== -1) {
            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            if (key) {
              frontmatter[key] = value;
            }
          }
        }
      }

      // Tag Extraction: frontmatter tags + inline #hashtags from body only
      const fmTags = fmMatch ? parseFrontmatterTags(fmMatch[1]) : [];
      const bodyContent = fmMatch ? content.slice(fmMatch[0].length) : content;
      const tagMatches = Array.from(bodyContent.matchAll(REGEX_TAG));
      const inlineTags = tagMatches.map((m: any) => m[1].toLowerCase());
      const tags = Array.from(new Set([...fmTags, ...inlineTags]));

      // Wiki Link Extraction
      const linkMatches = Array.from(content.matchAll(REGEX_LINK));
      const links = Array.from(new Set(linkMatches.map((m: any) => m[1].trim())));

      // Metrics
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

      results.push({ path, name, tags, links, frontmatter, modifiedAt, wordCount });
    } catch (err: any) {
      console.error(`Worker error processing file (${fileInfo.path}):`, err?.message || err);
    }
  }

  self.postMessage({ results });
};
