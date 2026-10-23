import type { FileMetadata } from "@/app/atoms/metadata";

// The vault path a Markdown file link (`[Editor](./app/editor/README.md)`)
// points at, read from the linking note's folder: `./` and `../` walk from
// there, a leading `/` starts at the vault root, `#heading` and `?query` are
// dropped and `%20`-style escapes decoded. Null when the link names no file
// or climbs out of the vault.
export function fileLinkPath(href: string, fromPath?: string | null): string | null {
  const bare = href.split(/[?#]/)[0];
  let decoded = bare;
  try {
    decoded = decodeURIComponent(bare);
  } catch {
    // A stray `%` is kept as typed.
  }
  if (!decoded) return null;

  const parts = decoded.startsWith("/") ? [] : (fromPath ?? "").split("/").slice(0, -1);
  for (const segment of decoded.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (parts.length === 0) return null;
      parts.pop();
    } else {
      parts.push(segment);
    }
  }
  return parts.length > 0 ? parts.join("/") : null;
}

// The vault file a Markdown file link opens: the exact path, then any case,
// then the same path with `.md` added (`[Plan](./plan)`).
export function resolveFileLink(
  href: string,
  fileMetadata: Record<string, FileMetadata>,
  fromPath?: string | null,
): FileMetadata | null {
  const path = fileLinkPath(href, fromPath);
  if (!path) return null;
  const metas = Object.values(fileMetadata);
  for (const candidate of path.toLowerCase().endsWith(".md") ? [path] : [path, `${path}.md`]) {
    const lower = candidate.toLowerCase();
    const match = metas.find((meta) => meta.path === candidate) ?? metas.find((meta) => meta.path.toLowerCase() === lower);
    if (match) return match;
  }
  return null;
}
