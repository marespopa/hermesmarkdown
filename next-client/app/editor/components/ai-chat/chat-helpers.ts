import type { FileMetadata } from "@/app/atoms/metadata";
import { showErrorToast } from "@/app/components/Toastr";
import { frontmatterList } from "@/app/utils/frontmatter-utils";
import { isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { noteDescription } from "./chat-tool-runners";

// The AI companion's composer helpers: model fallbacks, attachment limits,
// and @mention resolution (single note, folder index, vault index).
export const FALLBACK_CLAUDE_MODELS = [
  { id: "sonnet-5", name: "Claude Sonnet 5" },
  { id: "haiku-4-5", name: "Claude 4.5 Haiku" },
  { id: "opus-4-8", name: "Claude 4.8 Opus" },
];
export const FALLBACK_GEMINI_MODELS = [
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro (Preview)" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite" },
];
// Ollama has no fixed list: only the models the instance reports are offered.
export const FALLBACK_OLLAMA_MODELS: { id: string; name: string }[] = [];

export const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
export const MAX_SIZE = 5_000_000;
export const ACCEPT_FILES = "*/*";

export interface Attachment {
  name: string;
  isImage: boolean;
  mimeType: string;
  data: string;
}

// Vault file references loaded via @mention — kept separate from file attachments.
// Content is injected into the API payload; the @name stays inline in the display text.
export interface VaultRef {
  label: string;   // "@filename" exactly as it appears in the text
  content: string;
}

// @mention dropdown entries: a single file, a whole-vault index, or a folder-scoped index.
// @vault/@folder inject a lightweight index (path + title + tags) rather than full file
// contents — dumping every note's body would blow past the model's context on any real vault.
export type MentionOption =
  | { kind: "file"; file: FileMetadata }
  | { kind: "vault" }
  | { kind: "folder"; path: string };

// "- Plans/Roadmap.md: Roadmap [work] (aka Plan, Q4) — What ships this quarter."
// Aliases and the description come from the frontmatter so an agent can tell
// notes apart without reading them; a private note's are left out.
export function describeFile(m: FileMetadata): string {
  const title = m.frontmatter?.title || m.name.replace(/\.md$/, "");
  const tags = m.tags?.length ? ` [${m.tags.join(", ")}]` : "";
  if (isPrivateFrontmatter(m.frontmatter)) return `- ${m.path}: ${title}${tags}`;
  const aliases = frontmatterList(m.frontmatter?.aliases);
  const description = noteDescription(m);
  return `- ${m.path}: ${title}${tags}${aliases.length ? ` (aka ${aliases.join(", ")})` : ""}${description ? ` — ${description}` : ""}`;
}

export function buildIndex(fileMetadata: Record<string, FileMetadata>, pathPrefix?: string): string {
  const files = Object.values(fileMetadata)
    .filter((m) => !m.path.split("/").some((seg) => seg.startsWith("_")))
    .filter((m) => !pathPrefix || m.path.startsWith(pathPrefix))
    .sort((a, b) => a.path.localeCompare(b.path));
  return files.map(describeFile).join("\n");
}

// Picking a mention from the dropdown is what actually loads its content into `vaultRefs`.
// If the user types straight through (e.g. "@vault Update all files…") the dropdown closes
// on the next space before it's ever "selected", so the token would otherwise reach the model
// as inert text with no data attached. This re-scans the final message for any @vault,
// @folder:<path>, or @<file> token not already resolved and loads it just before sending.
export async function resolveMentionRefs(
  text: string,
  existing: VaultRef[],
  fileMetadata: Record<string, FileMetadata>,
  vaultHandle: any,
): Promise<VaultRef[]> {
  const existingLabels = new Set(existing.map((r) => r.label));
  const tokens = Array.from(new Set(text.match(/@[^\s@]+/g) || []))
    .map((t) => t.replace(/[.,!?;:)\]]+$/, ""))
    .filter((t) => t.length > 1 && !existingLabels.has(t));

  const resolved: VaultRef[] = [];
  for (const token of tokens) {
    try {
      if (token === "@vault") {
        resolved.push({ label: token, content: buildIndex(fileMetadata) });
      } else if (token.startsWith("@folder:")) {
        const path = token.slice("@folder:".length);
        resolved.push({ label: token, content: buildIndex(fileMetadata, `${path}/`) });
      } else {
        const name = token.slice(1).toLowerCase();
        const file = Object.values(fileMetadata).find((m) => m.name.replace(/\.md$/, "").toLowerCase() === name);
        if (file) {
          const content = await readVaultFile(file.path, vaultHandle);
          resolved.push({ label: token, content });
        }
      }
    } catch {
      // Unresolvable token — leave as plain text rather than failing the whole send
    }
  }
  return resolved;
}

export function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function readVaultFile(
  path: string,
  vaultHandle: any,
): Promise<string> {
  if (vaultHandle) {
    const parts = path.split("/");
    let current: any = vaultHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i]);
    }
    const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
    const file = await fileHandle.getFile();
    return await file.text();
  }
  throw new Error("No vault available");
}

// Reads user-picked files for the companion: images as data URLs, everything else
// as text. Files over MAX_SIZE or that can't be read are skipped with a toast.
export async function readAttachments(files: FileList): Promise<Attachment[]> {
  const next: Attachment[] = [];
  for (const file of Array.from(files)) {
    if (file.size > MAX_SIZE) { showErrorToast(`${file.name} is too large (max 5 MB).`); continue; }
    try {
      if (IMAGE_TYPES.has(file.type)) {
        next.push({ name: file.name, isImage: true, mimeType: file.type, data: await readAsDataURL(file) });
      } else {
        next.push({ name: file.name, isImage: false, mimeType: file.type, data: await file.text() });
      }
    } catch { showErrorToast(`Could not read ${file.name}.`); }
  }
  return next;
}
