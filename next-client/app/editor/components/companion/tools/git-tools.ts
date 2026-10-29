import type { ChangedFile, ChangesResult, FileStatus } from "@/app/services/git/git-changes-types";
import { isMarkdownPath } from "@/app/utils/file-kinds";
import { isPrivateContent } from "@/app/utils/note-privacy";
import { capText } from "./read-tools";

// The pure half of the companion's git tools (git_status, git_diff): what
// changed since HEAD, from the Changes scan (services/git/git-changes-scan.ts),
// as text for the model. Read only: committing is the user's, in their
// terminal. Private notes and the app's own data folder never show.

const LETTER: Record<FileStatus, string> = { added: "A", modified: "M", deleted: "D" };
const STATUS_LINES = 200;

// The scan's files the companion may see, by path.
export function visibleChanges(files: ChangedFile[], isPrivatePath: (path: string) => boolean): ChangedFile[] {
  return files
    .filter((file) => !file.path.startsWith(".hermesmarkdown/") && !isPrivatePath(file.path))
    .filter((file) => !(file.diff.kind === "text" && isMarkdownPath(file.path) && isPrivateContent(file.diff.lines.join("\n"))))
    .sort((a, b) => a.path.localeCompare(b.path));
}

const counts = (file: ChangedFile) => (file.added === null ? "binary" : `+${file.added} −${file.removed}`);

// git_status: every changed file with its letter and line counts, or why
// there is nothing to say.
export function gitStatusOutput(result: ChangesResult | "cancelled", isPrivatePath: (path: string) => boolean): string {
  if (result === "cancelled") return "The scan was interrupted. Try git_status again.";
  if (result.status === "no-repo") return "The vault isn't a git repository, so there is no status.";
  if (result.status === "error") return `Couldn't read the repository${result.detail ? `: ${result.detail}` : ""}.`;
  const files = visibleChanges(result.files, isPrivatePath);
  const head = result.commit ? `Compared with HEAD ${result.commit.slice(0, 7)}.` : "No commits yet; every file is new.";
  if (!files.length) return `${head} No uncommitted changes.`;
  const shown = files.slice(0, STATUS_LINES).map((file) => `${LETTER[file.status]} ${file.path} (${counts(file)})`);
  const more = files.length > STATUS_LINES ? `\n[${files.length - STATUS_LINES} more not shown]` : "";
  return `${head} ${files.length} changed file${files.length === 1 ? "" : "s"} (A added, M modified, D deleted):\n${shown.join("\n")}${more}`;
}

// One file's changes as unified-diff hunks (no context lines).
export function fileDiffText(file: ChangedFile): string {
  const head = `--- ${file.path} (${file.status})`;
  const { diff } = file;
  if (diff.kind === "binary") return `${head}\nBinary file.`;
  if (diff.kind === "too-large") return `${head}\nToo large to diff.`;
  if (diff.kind !== "text") return `${head}\nNo diff available.`;
  const hunks = diff.changes.map(({ oldStart, removed, newStart, newCount }) => {
    const added = diff.lines.slice(newStart - 1, newStart - 1 + newCount);
    return [`@@ -${oldStart},${removed.length} +${newStart},${newCount} @@`, ...removed.map((line) => `-${line}`), ...added.map((line) => `+${line}`)].join("\n");
  });
  return `${head}\n${hunks.join("\n") || "No line changes."}`;
}

// git_diff: the diff of one path, or of every changed file when none is
// given, capped.
export function gitDiffOutput(result: ChangesResult | "cancelled", path: string, isPrivatePath: (path: string) => boolean): string {
  if (result === "cancelled" || result.status !== "ok") return gitStatusOutput(result, isPrivatePath);
  const files = visibleChanges(result.files, isPrivatePath);
  const wanted = path ? files.filter((file) => file.path === path || file.path.startsWith(`${path}/`)) : files;
  if (!wanted.length) return path ? `No uncommitted changes in ${path}. Use git_status to see what changed.` : "No uncommitted changes.";
  const text = wanted.map(fileDiffText).join("\n\n");
  return `--- DIFF ---\n${capText(text)}\n--- END DIFF ---${text.length > 40_000 ? "\n(Long: ask for one file's diff with path.)" : ""}`;
}
