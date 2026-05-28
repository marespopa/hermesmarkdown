// app/utils/metadataExtractor.ts

const REGEX_TAG = /(?<=^|\s)#([a-zA-Z0-9_\-\/]+)/g;
const REGEX_FRONTMATTER = /^---\n([\s\S]*?)\n---/;

export interface ExtractedMetadata {
  tags: string[];
  frontmatter: Record<string, any>;
  wordCount: number;
}

export const extractMetadata = (content: string): ExtractedMetadata => {
  // Frontmatter Extraction
  const frontmatter: Record<string, any> = {};
  const fmMatch = content.match(REGEX_FRONTMATTER);
  if (fmMatch) {
    const fmContent = fmMatch[1];
    const lines = fmContent.split("\n");
    for (const line of lines) {
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

  // Inline Tag Extraction
  const tagMatches = Array.from(content.matchAll(REGEX_TAG));
  const tags = Array.from(new Set(tagMatches.map((m: any) => m[1].toLowerCase())));

  // Metrics
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return {
    tags,
    frontmatter,
    wordCount,
  };
};
