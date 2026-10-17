import type { CompletionSection } from "@codemirror/autocomplete";
import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import {
  MARK_PRIVATE_SENTINEL,
  MARK_PUBLIC_SENTINEL,
  FRONTMATTER_WIZARD_SENTINEL,
  type Template,
} from "../components/constants";
import { markerFor, parseBlockLine, type BlockType } from "./block-type";

// The slash menu's search and its "Basic blocks": like Notion's `/`, a block
// command turns the caret's line into that block, keeping its text (an empty
// line becomes an empty heading, list item, …), and every command is found
// by its name, a word of it, an alias (`/h1`, `/todo`, `/yaml`) or a word
// of its description.

export type BlockCommandType = Exclude<BlockType, "h4" | "h5" | "h6"> | "divider";

export interface SlashCommand {
  label: string;
  description: string;
  aliases?: string[];
  /** Set for the basic blocks; the rest come from TEMPLATES (constants.ts). */
  block?: BlockCommandType;
}

export const BLOCK_COMMANDS: SlashCommand[] = [
  { label: "Text", description: "Plain paragraph text", aliases: ["paragraph", "plain", "p"], block: "text" },
  { label: "Heading 1", description: "Big section heading", aliases: ["h1", "#", "title"], block: "h1" },
  { label: "Heading 2", description: "Medium section heading", aliases: ["h2", "##", "subheading"], block: "h2" },
  { label: "Heading 3", description: "Small section heading", aliases: ["h3", "###"], block: "h3" },
  { label: "Bulleted list", description: "A simple bulleted list", aliases: ["bullet", "ul", "list"], block: "bullet" },
  { label: "Numbered list", description: "A list numbered 1, 2, 3", aliases: ["ol", "1.", "numbers"], block: "numbered" },
  { label: "To-do list", description: "Track tasks with a checkbox", aliases: ["todo", "checkbox", "[]"], block: "todo" },
  { label: "Quote", description: "Set text apart as a quotation", aliases: ["blockquote", ">", "citation"], block: "quote" },
  { label: "Divider", description: "A line between sections", aliases: ["hr", "line", "separator", "rule"], block: "divider" },
];

// Shown as headers only while nothing follows the `/`; a search lists the
// best matches first, whatever their section.
const SECTIONS = {
  blocks: { name: "Basic blocks", rank: 0 },
  insert: { name: "Insert", rank: 1 },
  templates: { name: "Templates", rank: 2 },
  note: { name: "Note", rank: 3 },
  ai: { name: "AI", rank: 4 },
} satisfies Record<string, CompletionSection>;

const NOTE_SENTINELS = [FRONTMATTER_WIZARD_SENTINEL, MARK_PRIVATE_SENTINEL, MARK_PUBLIC_SENTINEL];

export function slashSection(command: SlashCommand | Template): CompletionSection {
  if ("block" in command && command.block) return SECTIONS.blocks;
  const template = command as Template;
  if (template.aiOnly) return SECTIONS.ai;
  if (template.vaultOnly || template.templateOnly || template.saveTemplateOnly) return SECTIONS.templates;
  if (NOTE_SENTINELS.includes(template.content)) return SECTIONS.note;
  return SECTIONS.insert;
}

// Lowercase letters, digits and the few marks aliases use (`#`, `>`, `[]`).
// Hyphens stand in for spaces, since a space closes the menu: "/mark-as-private".
function compact(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9#>[\].]/g, "");
}

function isSubsequence(hay: string, needle: string): boolean {
  let ni = 0;
  for (let hi = 0; hi < hay.length && ni < needle.length; hi++) {
    if (hay[hi] === needle[ni]) ni++;
  }
  return ni === needle.length;
}

// How well `query` finds `command`, best first: 0 an exact name or alias,
// 1 the name's start, 2 an alias's start, 3 a later word of the name,
// 4 a word of the description (3+ letters), 5 the name's letters in order;
// null for no match.
export function slashMatchScore(command: SlashCommand, query: string): number | null {
  const q = compact(query);
  if (!q) return 5;
  const name = compact(command.label);
  const aliases = (command.aliases ?? []).map(compact);
  if (name === q || aliases.includes(q)) return 0;
  if (name.startsWith(q)) return 1;
  if (aliases.some((alias) => alias.startsWith(q))) return 2;
  const words = (text: string) => text.toLowerCase().split(/[\s:/-]+/).map(compact);
  if (words(command.label).some((word) => word.startsWith(q))) return 3;
  if (q.length >= 3 && words(command.description).some((word) => word.startsWith(q))) return 4;
  return isSubsequence(name, q) ? 5 : null;
}

// The commands `query` finds, best match first; equal matches keep the order
// they were given in.
export function rankSlashCommands<T extends SlashCommand>(commands: T[], query: string): T[] {
  return commands
    .map((command, index) => ({ command, index, score: slashMatchScore(command, query) }))
    .filter((entry): entry is { command: T; index: number; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.command);
}

// Removes the `/query` trigger (`from`–`to`) and turns its line into `type`,
// as one undo step with the caret where the trigger was. A divider goes on a
// line of its own: the trigger's line when that is empty, else below it,
// always with a blank line above so it isn't read as a setext heading.
export function applyBlockCommand(view: EditorView, from: number, to: number, type: BlockCommandType) {
  const { state } = view;
  const line = state.doc.lineAt(from);
  const parsed = parseBlockLine(line.text);
  const after = state.sliceDoc(to, line.to);
  // "Intro /h1" becomes "# Intro", not "# Intro ".
  let start = from;
  if (from - 1 >= line.from + parsed.prefixLength && state.sliceDoc(from - 1, from) === " " && /^(\s|$)/.test(after)) start--;

  if (type === "divider") {
    const rest = state.sliceDoc(line.from, start) + after;
    if (rest.trim()) {
      const insert = "\n\n---\n";
      const changes = state.changes([{ from: start, to, insert: "" }, { from: line.to, insert }]);
      view.dispatch({
        changes,
        selection: EditorSelection.cursor(changes.mapPos(line.to, 1)),
        userEvent: "input.replace.template",
        scrollIntoView: true,
      });
      return;
    }
    const previous = line.number > 1 ? state.doc.line(line.number - 1).text : "";
    const insert = `${previous.trim() ? "\n" : ""}---\n`;
    view.dispatch({
      changes: { from: line.from, to: line.to, insert },
      selection: EditorSelection.cursor(line.from + insert.length),
      userEvent: "input.replace.template",
      scrollIntoView: true,
    });
    return;
  }

  const changes = state.changes([
    ...(parsed.type === type ? [] : [{ from: line.from, to: line.from + parsed.prefixLength, insert: markerFor(type, parsed.indent, 1) }]),
    { from: start, to, insert: "" },
  ]);
  view.dispatch({
    changes,
    selection: EditorSelection.cursor(changes.mapPos(to, 1)),
    userEvent: "input.replace.template",
    scrollIntoView: true,
  });
}
