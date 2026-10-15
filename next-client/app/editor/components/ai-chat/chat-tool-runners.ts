import type { FileMetadata } from "@/app/atoms/metadata";
import type { ContentHit } from "@/app/workers/content-search-protocol";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import type { TaskItem } from "@/app/utils/taskExtractor";
import { boardTextForReading } from "@/app/utils/board/board-format";

// The pure half of AI Chat's tools (declared in app/api/ai/chat-tools.ts):
// what each one answers, from the vault's index and the text the client read.
// use-chat-tools.ts runs them. Private notes (`private: true` or tag) are never
// returned: searching skips them, and reading one says it's private.

export const CHAT_TOOL_NAMES = ["search_notes", "read_note", "list_open_tasks"] as const;
export type ChatToolName = (typeof CHAT_TOOL_NAMES)[number];

export const NOTE_CHAR_LIMIT = 20_000;
export const DEFAULT_SEARCH_LIMIT = 8;

export const noteName = (path: string) => (path.split("/").pop() ?? path).replace(/\.md$/i, "");

const isPrivate = (file: FileMetadata) => isPrivateFrontmatter(file.frontmatter);

/** The notes a tool may look at: not private, not skipped (templates, .hermes/). */
export function searchablePaths(meta: Record<string, FileMetadata>, skip: (path: string) => boolean): string[] {
  return Object.values(meta).filter((file) => !skip(file.path) && !isPrivate(file)).map((file) => file.path);
}

// Notes whose name, title or tags hold the query, then content hits (from the
// content index, when there is one), one line per note, at most `limit`.
export function searchNotesOutput(
  query: string,
  meta: Record<string, FileMetadata>,
  paths: string[],
  hits: ContentHit[] | null,
  limit = DEFAULT_SEARCH_LIMIT,
): string {
  const needle = query.trim().toLowerCase();
  const allowed = new Set(paths);
  const lines = new Map<string, string>();
  for (const path of paths) {
    const file = meta[path];
    const title = typeof file?.frontmatter?.title === "string" ? file.frontmatter.title : "";
    const tags = file?.tags ?? [];
    if ([noteName(path), title, ...tags].some((value) => value.toLowerCase().includes(needle))) {
      lines.set(path, `- [[${noteName(path)}]]${title ? ` (${title})` : ""}: name or tag match`);
    }
  }
  for (const hit of hits ?? []) {
    if (!allowed.has(hit.path) || lines.has(hit.path)) continue;
    lines.set(hit.path, `- [[${noteName(hit.path)}]], line ${hit.line}: ${hit.snippet}`);
  }
  const shown = [...lines.values()].slice(0, limit);
  if (!shown.length) return `No notes match "${query}".${hits === null ? " (Only note names and tags were searched.)" : ""}`;
  return `${shown.length} note${shown.length === 1 ? "" : "s"} match "${query}":\n${shown.join("\n")}`;
}

// A note's text for read_note, capped, or why it can't be read.
export function readNoteOutput(name: string, file: FileMetadata | null, text: string | null): string {
  if (!file) return `No note named "${name}".`;
  if (isPrivate(file) || (text !== null && isPrivateContent(text))) {
    return `[[${noteName(file.path)}]] is private, so it isn't shared. Ask the user to open it.`;
  }
  if (text === null) return `[[${noteName(file.path)}]] couldn't be read.`;
  const readable = boardTextForReading(text);
  const body = readable.length > NOTE_CHAR_LIMIT ? `${readable.slice(0, NOTE_CHAR_LIMIT)}\n[note continues…]` : readable;
  return `--- NOTE: [[${noteName(file.path)}]] (${file.path}) ---\n${body}\n--- END NOTE ---`;
}

export type TaskView = "all" | "in_progress" | "due_today" | "overdue" | "upcoming";

// list_open_tasks' narrowing, for openTasksBlock.
export function taskFilter({ view = "all", tag, query }: { view?: TaskView; tag?: string; query?: string }) {
  const wantTag = tag?.replace(/^#/, "").toLowerCase();
  const wantText = query?.trim().toLowerCase();
  return (task: TaskItem, today: string) => {
    if (wantTag && !task.tags.includes(wantTag)) return false;
    if (wantText && !task.text.toLowerCase().includes(wantText)) return false;
    if (view === "in_progress") return task.status === "prog";
    if (view === "due_today") return task.dueDate === today;
    if (view === "overdue") return !!task.dueDate && task.dueDate < today;
    if (view === "upcoming") return !!task.dueDate && task.dueDate > today;
    return true;
  };
}

const VIEW_LABEL: Record<TaskView, string> = {
  all: "open tasks",
  in_progress: "tasks in progress",
  due_today: "tasks due today",
  overdue: "overdue tasks",
  upcoming: "upcoming tasks",
};

const quoted = (text: string) => `“${text.length > 40 ? `${text.slice(0, 39).trimEnd()}…` : text}”`;

// The quiet line the chat shows for a tool call it ran.
export function toolActivity(name: string, input: Record<string, unknown>, detail = ""): string {
  const suffix = detail ? ` · ${detail}` : "";
  if (name === "search_notes") return `Searched notes for ${quoted(String(input.query ?? ""))}${suffix}`;
  if (name === "read_note") return `Read ${String(input.name ?? "a note")}${suffix}`;
  if (name === "list_open_tasks") {
    const view = (input.view as TaskView | undefined) ?? "all";
    const tag = input.tag ? ` tagged #${String(input.tag).replace(/^#/, "")}` : "";
    return `Looked at ${VIEW_LABEL[view] ?? VIEW_LABEL.all}${tag}${suffix}`;
  }
  return `${name}${suffix}`;
}
