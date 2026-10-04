import type { FileMetadata } from "@/app/atoms/metadata";
import { showErrorToast } from "@/app/components/Toastr";
import type { ApiPart } from "@/app/services/ai";
import { FORMULA_PRESERVATION_RULE, NOTE_CALC_GUIDE, TABLE_FORMULA_GUIDE } from "../../utils/formula-ai-guide";

// AI Chat building blocks: model fallbacks, attachment limits, @mention
// resolution (single note, folder index, vault index), the system prompt,
// and request-content assembly.
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

export const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
export const MAX_SIZE = 5_000_000;
export const ACCEPT_IMAGES = "image/png,image/jpeg,image/gif,image/webp";
export const ACCEPT_FILES = "*/*";

export interface ChatMessage {
  role: "user" | "assistant";
  displayContent: string;
  apiContent: string | ApiPart[];
}

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

function describeFile(m: FileMetadata): string {
  const title = m.frontmatter?.title || m.name.replace(/\.md$/, "");
  const tags = m.tags?.length ? ` [${m.tags.join(", ")}]` : "";
  return `- ${m.path}: ${title}${tags}`;
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

export const SYSTEM_PROMPT = `You are an AI writing assistant for HermesMarkdown, a markdown note-taking app.
You help users write, edit, and improve their markdown documents through conversation.

${FORMULA_PRESERVATION_RULE}

When the user asks you to create or modify content:
- Output only the content itself — no preamble, meta-commentary, or surrounding quotes.
- Preserve all existing Markdown formatting unless explicitly asked to change it.
- Use proper Markdown syntax (headings, lists, bold, etc.) as appropriate.
- When revising a section, return the complete revised section ready to apply.
- When the user asks for totals, averages, counts or other calculations in a table, write them as formulas (see below), not as precomputed numbers. Outside tables, use inline calculator lines (see below). When they ask what a formula does or why it shows an error, explain it using the rules below.

${TABLE_FORMULA_GUIDE}

${NOTE_CALC_GUIDE}`;

// Cap on how much of the active file goes into every request — enough for
// typical notes while keeping very long documents from eating the context.
export const ACTIVE_FILE_CHAR_LIMIT = 20_000;

/**
 * System prompt for a chat turn: the base instructions, the active file
 * (name + content, always included so the model knows what the user is
 * working on), when present the selection as the edit target, and the
 * instructions of any active chat skill (see chat-skills.ts).
 */
export function buildChatSystemPrompt(
  documentContent: string,
  selectedText: string,
  currentFilePath?: string,
  skillInstructions: string[] = [],
): string {
  const parts = [SYSTEM_PROMPT];
  const fileName = currentFilePath?.split("/").pop() || "Untitled";
  if (documentContent.trim()) {
    const body =
      documentContent.length > ACTIVE_FILE_CHAR_LIMIT
        ? documentContent.slice(0, ACTIVE_FILE_CHAR_LIMIT) + "\n\n[document continues…]"
        : documentContent;
    const location = currentFilePath ? ` (${currentFilePath})` : "";
    parts.push(
      `\n--- ACTIVE FILE: ${fileName}${location} — the note the user is working on; for context only, output only the requested content, not the full document ---\n${body}\n--- END ACTIVE FILE ---`,
    );
  }
  if (selectedText.trim()) {
    parts.push(`\n--- SELECTED TEXT (target for edits) ---\n${selectedText}\n--- END SELECTED TEXT ---`);
  }
  for (const instructions of skillInstructions) {
    if (instructions.trim()) parts.push(`\n--- SKILL ---\n${instructions}\n--- END SKILL ---`);
  }
  return parts.join("\n");
}

export function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function buildApiContent(text: string, atts: Attachment[]): string | ApiPart[] {
  const hasImages = atts.some((a) => a.isImage);
  if (!atts.length) return text;
  if (!hasImages) {
    const blocks = atts
      .map((a) => `--- File: ${a.name} ---\n${a.data}\n--- End: ${a.name} ---`)
      .join("\n\n");
    return text ? `${text}\n\n${blocks}` : blocks;
  }
  const parts: ApiPart[] = [];
  if (text) parts.push({ type: "text", text });
  for (const att of atts) {
    if (att.isImage) {
      const base64 = att.data.split(",")[1] ?? att.data;
      parts.push({ type: "image", image: base64, mimeType: att.mimeType });
    } else {
      parts.push({ type: "text", text: `--- File: ${att.name} ---\n${att.data}\n--- End: ${att.name} ---` });
    }
  }
  return parts;
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

// Reads user-picked files for AI Chat: images as data URLs, everything else
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
