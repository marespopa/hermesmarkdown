// app/workers/metadata.worker.ts

const REGEX_TAG = /(?<=^|\s)#([a-zA-Z0-9_\-/]+)/g;
const REGEX_LINK = /\[\[(.*?)\]\]/g;
const REGEX_FRONTMATTER = /^---\n([\s\S]*?)\n---/;

self.onmessage = async (event: MessageEvent) => {
  const { files } = event.data; // Expecting array of { handle: FileSystemFileHandle, path: string }

  if (!files || !Array.isArray(files)) return;

  const results = [];
  
  for (const fileInfo of files) {
    try {
      const { handle, path } = fileInfo;
      const file = await handle.getFile();
      const content = await file.text();
      const name = handle.name;
      const modifiedAt = file.lastModified;

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

      // Wiki Link Extraction
      const linkMatches = Array.from(content.matchAll(REGEX_LINK));
      const links = Array.from(new Set(linkMatches.map((m: any) => m[1].trim())));

      // Metrics
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

      results.push({
        path,
        name,
        tags,
        links,
        frontmatter,
        modifiedAt,
        wordCount,
        handle, // Pass it back to be stored in the atom
      });
    } catch (err: any) {
      // Avoid noisy error logs for common file system race conditions
      const isExpectedError = 
        err.name === "InvalidStateError" || 
        err.name === "NotFoundError" || 
        err.message?.includes("state had changed") ||
        err.message?.includes("could not be found");

      if (isExpectedError) {
        console.warn(`Worker skipped file (stale/missing): ${fileInfo.path}`);
      } else {
        console.error(`Worker error processing file (${fileInfo.path}):`, err?.message || err);
      }
    }
  }

  self.postMessage({ results });
};
