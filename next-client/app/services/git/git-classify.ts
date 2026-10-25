// Which bytes get a text diff. Kept apart from git-file-diff.ts so the
// git-read worker doesn't pull @codemirror/merge in for it.
export const MAX_DIFF_BYTES = 2 * 1024 * 1024;

/** Over 2 MB is too large, a NUL in the first 8 KB is binary. */
export function classifyBytes(bytes: Uint8Array): "ok" | "binary" | "too-large" {
  if (bytes.length > MAX_DIFF_BYTES) return "too-large";
  if (bytes.subarray(0, 8192).includes(0)) return "binary";
  return "ok";
}
