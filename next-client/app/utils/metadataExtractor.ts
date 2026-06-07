// app/utils/metadataExtractor.ts

const REGEX_TAG = /(?<=^|\s)#(?=[a-zA-Z0-9_\-/]*[a-zA-Z])([a-zA-Z0-9_\-/]+)/g;
const REGEX_FRONTMATTER = /^---\n([\s\S]*?)\n---/;

export interface ExtractedMetadata {
  tags: string[];
  frontmatter: Record<string, any>;
  wordCount: number;
}

function parseFrontmatterTags(fmContent: string): string[] {
  // Inline array: tags: [a, b, c]
  const inlineMatch = fmContent.match(/^tags:\s*\[(.*?)\]/m);
  if (inlineMatch) {
    return inlineMatch[1]
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }

  // Multi-line YAML list:
  // tags:
  //   - tag1
  //   - tag2
  const lines = fmContent.split("\n");
  const tagsLineIdx = lines.findIndex((l) => /^tags:\s*$/.test(l));
  if (tagsLineIdx !== -1) {
    const result: string[] = [];
    for (let i = tagsLineIdx + 1; i < lines.length; i++) {
      const listMatch = lines[i].match(/^\s*-\s+(.+)/);
      if (listMatch) {
        result.push(listMatch[1].trim().toLowerCase());
      } else {
        break;
      }
    }
    return result;
  }

  return [];
}

export const extractMetadata = (content: string): ExtractedMetadata => {
  // Frontmatter Extraction
  const frontmatter: Record<string, any> = {};
  let fmTags: string[] = [];
  const fmMatch = content.match(REGEX_FRONTMATTER);
  if (fmMatch) {
    const fmContent = fmMatch[1];
    fmTags = parseFrontmatterTags(fmContent);

    const lines = fmContent.split("\n");
    let skipUntilNextKey = false;
    for (const line of lines) {
      // Skip YAML list items — they're handled by parseFrontmatterTags
      if (/^\s*-\s+/.test(line)) continue;
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        if (key) {
          frontmatter[key] = value;
          skipUntilNextKey = false;
        }
      } else {
        skipUntilNextKey = true;
      }
      void skipUntilNextKey;
    }
  }

  // Inline Tag Extraction (body only, excluding frontmatter block)
  const bodyContent = fmMatch
    ? content.slice(fmMatch[0].length)
    : content;
  const tagMatches = Array.from(bodyContent.matchAll(REGEX_TAG));
  const inlineTags = tagMatches.map((m: any) => m[1].toLowerCase());

  // Merge frontmatter tags + inline tags, deduplicated
  const tags = Array.from(new Set([...fmTags, ...inlineTags]));

  // Metrics
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return {
    tags,
    frontmatter,
    wordCount,
  };
};
