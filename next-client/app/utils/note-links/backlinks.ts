import type { FileMetadata } from "@/app/atoms/metadata";
import { createLinkResolver } from "./link-resolver";
import { parseLinkTarget } from "./wikilink-scan";

/** target path → source paths (sorted, unique, self-links excluded). */
export function buildBacklinkIndex(fileMetadata: Record<string, FileMetadata>): Map<string, string[]> {
  const resolver = createLinkResolver(fileMetadata);
  const sets = new Map<string, Set<string>>();
  for (const source of Object.values(fileMetadata)) {
    for (const link of source.links ?? []) {
      const { target } = parseLinkTarget(link);
      if (!target) continue;
      const hit = resolver.resolve(target, source.path);
      if (!hit || hit.path === source.path) continue;
      let set = sets.get(hit.path);
      if (!set) sets.set(hit.path, (set = new Set()));
      set.add(source.path);
    }
  }
  const index = new Map<string, string[]>();
  for (const [target, set] of sets) index.set(target, [...set].sort());
  return index;
}
