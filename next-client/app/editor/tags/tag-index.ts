import type { FileMetadata } from "@/app/atoms/metadata";
import { isOpenStatus } from "@/app/utils/task-status";

export interface TagEntry {
  tag: string;
  count: number;
}

// A tag's place in the `/`-nested tree (`work/plans` sits under `work`).
// `count` is the notes carrying the tag or any tag below it, each counted once.
export interface TagNode {
  name: string;
  path: string;
  count: number;
  children: TagNode[];
}

export type NoteFilter = "all" | "untagged" | "todo";

export const NOTE_FILTERS: NoteFilter[] = ["all", "untagged", "todo"];

export interface TagIndex {
  tags: TagEntry[];
  tree: TagNode[];
  filterCounts: Record<NoteFilter, number>;
}

export function noteMatchesFilter(meta: Pick<FileMetadata, "tags" | "tasks">, filter: NoteFilter): boolean {
  if (filter === "untagged") return meta.tags.length === 0;
  if (filter === "todo") return meta.tasks.some((task) => isOpenStatus(task.status));
  return true;
}

// Whether a note carries `tag` itself or a tag nested below it.
export function noteHasTag(meta: Pick<FileMetadata, "tags">, tag: string): boolean {
  return meta.tags.some((own) => own === tag || own.startsWith(`${tag}/`));
}

// Every tag with its note count, the nested tree with rolled-up counts, and
// the system filters' counts, over the notes a listing may show (`visible`:
// Privacy Mode applies to counts as well as titles).
export function buildTagIndex(metadata: Record<string, FileMetadata>, visible: { has(path: string): boolean }): TagIndex {
  const exact = new Map<string, number>();
  const rolled = new Map<string, number>();
  const filterCounts: Record<NoteFilter, number> = { all: 0, untagged: 0, todo: 0 };

  for (const meta of Object.values(metadata)) {
    if (!visible.has(meta.path)) continue;
    for (const filter of NOTE_FILTERS) if (noteMatchesFilter(meta, filter)) filterCounts[filter]++;
    const prefixes = new Set<string>();
    for (const tag of new Set(meta.tags)) {
      exact.set(tag, (exact.get(tag) ?? 0) + 1);
      const parts = tag.split("/").filter(Boolean);
      for (let i = 1; i <= parts.length; i++) prefixes.add(parts.slice(0, i).join("/"));
    }
    for (const prefix of prefixes) rolled.set(prefix, (rolled.get(prefix) ?? 0) + 1);
  }

  const nodes = new Map<string, TagNode>();
  const roots: TagNode[] = [];
  for (const path of [...rolled.keys()].sort((a, b) => a.localeCompare(b))) {
    const slash = path.lastIndexOf("/");
    const node: TagNode = { name: path.slice(slash + 1), path, count: rolled.get(path)!, children: [] };
    nodes.set(path, node);
    (slash < 0 ? roots : nodes.get(path.slice(0, slash))?.children ?? roots).push(node);
  }

  const tags = [...exact].map(([tag, count]) => ({ tag, count })).sort((a, b) => a.tag.localeCompare(b.tag));
  return { tags, tree: roots, filterCounts };
}
