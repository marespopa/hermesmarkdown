export const SUBTLE =
  'class="text-zinc-500/20 dark:text-zinc-400/10 select-none"';
// Document lifecycle states — mirrors the `status:` frontmatter field so inline tags
// carry the same semantic weight as structured metadata.
export const WORKFLOW_TAGS = ["draft", "review", "active", "archived"];
// The palette's own status colours, so they follow the theme.
export const TAG_COLORS: Record<string, string> = {
  draft:    "text-task-hold",
  review:   "text-sage",
  active:   "text-task-done",
  archived: "text-fg-faint",
};

// Emoji shortcodes by name: `{fire}` expands to 🔥 (SHORTCODES), and typing
// `{` offers them as a menu (codemirror/emoji-completion.ts).
export const EMOJI_SHORTCODES: Record<string, string> = {
  check: "✅",
  error: "❌ ",
  idea: "💡 ",
  warn: "⚠️ ",
  fix: "🛠️ ",
  bug: "🐛 ",
  star: "⭐ ",
  note: "📝 ",
  question: "❓ ",
  info: "ℹ️ ",
  pin: "📌 ",
  link: "🔗 ",
  fire: "🔥 ",
  rocket: "🚀 ",
  party: "🎉 ",
  target: "🎯 ",
  lock: "🔒 ",
  key: "🔑 ",
};

export const SHORTCODES: Record<string, () => string> = {
  // --- Absolute Dates ---
  "..d": () => new Date().toLocaleDateString("en-CA"),
  "{date}": () => new Date().toLocaleDateString("en-CA"),
  "{time}": () =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  // --- Relative Dates ---
  "..tomorrow": () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-CA");
  },
  "..yesterday": () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("en-CA");
  },

  // --- Advanced Timestamps & Logs ---
  "{datetime}": () => {
    const d = new Date();
    const date = d.toLocaleDateString("en-CA");
    const time = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${date} ${time}`;
  },
  "{iso}": () => new Date().toISOString(),
  "{unix}": () => Math.floor(Date.now() / 1000).toString(),
  "..log": () =>
    `[${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}] --- `,

  // --- Calendar Metadata ---
  "{day}": () =>
    new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()),
  "{week}": () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return `W${weekNo}`;
  },

  // Table
  "{table}": () =>
    "| Header 1 | Header 2 | Header 3 |\n| -------- | -------- | -------- |\n| Cell     | Cell     | Cell     |\n| Cell     | Cell     | Cell     |",

  // List
  "{todo}": () => "- [ ] ",
  "{done}": () => "- [x] ",

  // Emojis: {check}, {fire}, … (EMOJI_SHORTCODES below)
  ...Object.fromEntries(
    Object.entries(EMOJI_SHORTCODES).map(([name, emoji]) => [`{${name}}`, () => emoji]),
  ),
};

export const LINK_EDITOR_SENTINEL = "__OPEN_LINK_EDITOR__";
export const WIKILINK_EDITOR_SENTINEL = "__OPEN_WIKILINK_EDITOR__";
export const DATE_EDITOR_SENTINEL = "__OPEN_DATE_EDITOR__";
export const TABLE_DIALOG_SENTINEL = "__OPEN_TABLE_DIALOG__";
export const FRONTMATTER_WIZARD_SENTINEL = "__OPEN_FRONTMATTER_WIZARD__";
export const TASK_EDITOR_SENTINEL = "__OPEN_TASK_EDITOR__";
export const AI_CHAT_SENTINEL = "__OPEN_AI_CHAT__";
export const VAULT_TEMPLATE_SENTINEL = "__OPEN_VAULT_TEMPLATE__";
export const TEMPLATE_FIELD_SENTINEL = "__OPEN_TEMPLATE_FIELD__";
export const SAVE_AS_TEMPLATE_SENTINEL = "__SAVE_AS_TEMPLATE__";
export const BOARD_LINK_SENTINEL = "__INSERT_BOARD_LINK__";
export const EMBED_FILE_SENTINEL = "__EMBED_FILE__";
export const EMOJI_PICKER_SENTINEL = "__OPEN_EMOJI_PICKER__";
export const MARK_PRIVATE_SENTINEL = "__MARK_PRIVATE__";
export const MARK_PUBLIC_SENTINEL = "__MARK_PUBLIC__";
export const AI_ACTION_SENTINEL_PREFIX = "__AI_ACTION__:";
export const aiActionSentinel = (id: string) => `${AI_ACTION_SENTINEL_PREFIX}${id}`;
export const CURSOR_SENTINEL = "\0";
export const CODE_BLOCK_TEMPLATE_CONTENT = `\n\`\`\`${CURSOR_SENTINEL}\n\n\`\`\`\n`;

export const PILL_CONTAINER_CLASSES =
  "absolute z-40 flex items-center gap-1 p-1 glass-panel rounded-lg pointer-events-auto select-none transition-all duration-200 ease-in-out";

export interface Template {
  label: string;
  icon: string;
  description: string;
  content: string;
  /** Other names the slash menu finds it by: `/url` for Link, `/yaml` for Frontmatter. */
  aliases?: string[];
  /** Only shown in the command menu when an AI provider/key is configured. */
  aiOnly?: boolean;
  /** Only shown when the editor can insert vault templates (onInsertVaultTemplate). */
  vaultOnly?: boolean;
  /** Only shown while editing a template (onInsertTemplateField). */
  templateOnly?: boolean;
  /** Only shown when the note can be saved as a template (onSaveAsTemplate). */
  saveTemplateOnly?: boolean;
  /** Only shown when a board can be created and linked (onInsertBoard). */
  boardOnly?: boolean;
  /** Only shown when the vault's notes can be embedded (embedFiles). */
  embedOnly?: boolean;
}

export const TEMPLATES: Template[] = [
  { label: "Link", icon: "🔗", description: "Insert a hyperlink", aliases: ["url", "href", "hyperlink"], content: LINK_EDITOR_SENTINEL },
  { label: "WikiLink", icon: "[[", description: "Link to another note", aliases: ["wiki", "backlink", "note link"], content: WIKILINK_EDITOR_SENTINEL },
  { label: "Date", icon: "📅", description: "Pick a date from the calendar", aliases: ["today", "calendar", "day"], content: DATE_EDITOR_SENTINEL },
  { label: "Task", icon: "☑️", description: "Create a checklist task with status, due date, and tags", aliases: ["due", "status"], content: TASK_EDITOR_SENTINEL },
  { label: "Table", icon: "⊞", description: "Insert a Markdown table", aliases: ["grid", "tbl"], content: TABLE_DIALOG_SENTINEL },
  {
    label: "Code",
    icon: "</>",
    description: "Insert a code block",
    aliases: ["codeblock", "snippet", "pre"],
    content: CODE_BLOCK_TEMPLATE_CONTENT,
  },
  {
    label: "Board",
    icon: "✎",
    description: "Create a drawing board and link it here",
    aliases: ["drawing", "canvas", "sketch"],
    content: BOARD_LINK_SENTINEL,
    boardOnly: true,
  },
  {
    label: "Embed file",
    icon: "⧉",
    description: "Show a note, table, image or code file here, read-only",
    aliases: ["embed", "transclude", "include"],
    content: EMBED_FILE_SENTINEL,
    embedOnly: true,
  },
  {
    label: "Mermaid",
    icon: "⎇",
    description: "Insert a Mermaid diagram block",
    aliases: ["diagram", "chart", "flowchart"],
    content: `\n\`\`\`mermaid\n${CURSOR_SENTINEL}\n\`\`\`\n`,
  },
  {
    label: "Emoji",
    icon: "😀",
    description: "Pick an emoji from the {name} shortcodes",
    aliases: ["icon", "smiley"],
    content: EMOJI_PICKER_SENTINEL,
  },
  // --- Structure ---
  {
    label: "Callout",
    icon: "📌",
    description: "Note, info, tip, warning, or danger block",
    aliases: ["admonition", "tip", "warning"],
    content: `> [!note]${CURSOR_SENTINEL}\n> `,
  },
  {
    label: "Collapse",
    icon: "🔽",
    description: "Collapsible section for long content",
    aliases: ["toggle", "fold", "details"],
    content: `> [!note]-${CURSOR_SENTINEL}\n> `,
  },
  {
    label: "Template",
    icon: "📄",
    description: "Insert a template from your vault",
    aliases: ["tpl"],
    content: VAULT_TEMPLATE_SENTINEL,
    vaultOnly: true,
  },
  {
    label: "Template field",
    icon: "{{",
    description: "Add a field like {{date}} or {{prompt:Owner}} to this template",
    aliases: ["field"],
    content: TEMPLATE_FIELD_SENTINEL,
    templateOnly: true,
  },
  {
    label: "Save as template",
    icon: "⇪",
    description: "Save this note as a template you can start other notes from",
    content: SAVE_AS_TEMPLATE_SENTINEL,
    saveTemplateOnly: true,
  },
  // --- AI ---
  {
    label: "AI Chat",
    icon: "✨",
    description: "Open AI Chat with the current note and selection",
    aliases: ["ai", "chat", "ask"],
    content: AI_CHAT_SENTINEL,
    aiOnly: true,
  },
  {
    label: "Improve writing",
    icon: "✨",
    description: "Rewrite selected text for clearer wording without changing its intent",
    content: aiActionSentinel("improve"),
    aiOnly: true,
  },
  {
    label: "Fix spelling and grammar",
    icon: "✅",
    description: "Apply a light correction pass to selected text",
    content: aiActionSentinel("fix-grammar"),
    aiOnly: true,
  },
  {
    label: "Shorten",
    icon: "✂️",
    description: "Compress verbose selected text",
    content: aiActionSentinel("shorten"),
    aiOnly: true,
  },
  {
    label: "Expand",
    icon: "➕",
    description: "Elaborate on terse selected text",
    content: aiActionSentinel("expand"),
    aiOnly: true,
  },
  {
    label: "Change tone: Formal",
    icon: "🎩",
    description: "Make selected text more formal",
    content: aiActionSentinel("tone-formal"),
    aiOnly: true,
  },
  {
    label: "Change tone: Casual",
    icon: "😊",
    description: "Make selected text more casual",
    content: aiActionSentinel("tone-casual"),
    aiOnly: true,
  },
  {
    label: "Change tone: Direct",
    icon: "🎯",
    description: "Make selected text more direct",
    content: aiActionSentinel("tone-direct"),
    aiOnly: true,
  },
  {
    label: "Change tone: Polished",
    icon: "💎",
    description: "Make selected text more polished",
    content: aiActionSentinel("tone-polished"),
    aiOnly: true,
  },
  {
    label: "Summarize",
    icon: "📃",
    description: "Turn selected text into a concise summary",
    content: aiActionSentinel("summarize"),
    aiOnly: true,
  },
  {
    label: "Extract tasks",
    icon: "🗒️",
    description: "Convert selected text into actionable task items",
    content: aiActionSentinel("extract-tasks"),
    aiOnly: true,
  },
  {
    label: "Create outline",
    icon: "📑",
    description: "Transform selected notes into headings and bullets",
    content: aiActionSentinel("outline"),
    aiOnly: true,
  },
  {
    label: "Generate title",
    icon: "🏷️",
    description: "Suggest a page title from the current note or selection",
    content: aiActionSentinel("title"),
    aiOnly: true,
  },
  {
    label: "Continue writing",
    icon: "➡️",
    description: "Continue from the cursor using nearby page context",
    content: aiActionSentinel("continue"),
    aiOnly: true,
  },
  {
    label: "Explain selection",
    icon: "❓",
    description: "Explain the selected concept in simpler terms",
    content: aiActionSentinel("explain"),
    aiOnly: true,
  },
  // --- Productivity ---
  {
    label: "Frontmatter",
    icon: "📄",
    description: "Insert or reveal document metadata",
    aliases: ["yaml", "properties", "metadata", "fm"],
    content: FRONTMATTER_WIZARD_SENTINEL,
  },
  // --- Privacy ---
  // One privacy entry at a time: the slash menu offers whichever would
  // change the note (/privacy, /private, /public all find it).
  {
    label: "Privacy: mark as private",
    icon: "🔒",
    description: "Add private: true to the frontmatter",
    aliases: ["private", "lock"],
    content: MARK_PRIVATE_SENTINEL,
  },
  {
    label: "Privacy: mark as public",
    icon: "🔓",
    description: "Remove private: true and the private tag from the frontmatter",
    aliases: ["public", "unlock"],
    content: MARK_PUBLIC_SENTINEL,
  },
];
