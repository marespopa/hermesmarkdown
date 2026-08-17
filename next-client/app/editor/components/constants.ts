export const SUBTLE =
  'class="text-zinc-500/20 dark:text-zinc-400/10 select-none"';
// Document lifecycle states — mirrors the `status:` frontmatter field so inline tags
// carry the same semantic weight as structured metadata.
export const WORKFLOW_TAGS = ["draft", "review", "active", "archived"];
export const TODO_TAGS = ["todo", "prog", "hold", "done"];
export const TAG_COLORS: Record<string, string> = {
  draft:    "text-amber-600 dark:text-amber-400",
  review:   "text-sage dark:text-sage",
  active:   "text-emerald-600 dark:text-emerald-400",
  archived: "text-ink-muted dark:text-stone",
  todo:     "text-sage dark:text-sage",
  prog:     "text-orange-500 dark:text-orange-400",
  hold:     "text-violet-500 dark:text-violet-400",
  done:     "text-teal-600 dark:text-teal-400",
};
export const TAG_CYCLE: Record<string, string> = {
  draft:    "review",
  review:   "active",
  active:   "archived",
  archived: "draft",
};
export const TAG_CYCLE_PREV: Record<string, string> = {
  draft:    "archived",
  review:   "draft",
  active:   "review",
  archived: "active",
};
export const TODO_CYCLE: Record<string, string> = {
  todo: "prog",
  prog: "hold",
  hold: "done",
  done: "todo",
};
export const TODO_CYCLE_PREV: Record<string, string> = {
  todo: "done",
  prog: "todo",
  hold: "prog",
  done: "hold",
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

  // Emojis
  "{check}": () => "✅",
  "{error}": () => "❌ ",
  "{idea}": () => "💡 ",
  "{warn}": () => "⚠️ ",
  "{fix}": () => "🛠️ ",
  "{bug}": () => "🐛 ",
  "{star}": () => "⭐ ",
};

export const LINK_EDITOR_SENTINEL = "__OPEN_LINK_EDITOR__";
export const WIKILINK_EDITOR_SENTINEL = "__OPEN_WIKILINK_EDITOR__";
export const DATE_EDITOR_SENTINEL = "__OPEN_DATE_EDITOR__";
export const TABLE_DIALOG_SENTINEL = "__OPEN_TABLE_DIALOG__";
export const FRONTMATTER_WIZARD_SENTINEL = "__OPEN_FRONTMATTER_WIZARD__";
export const AI_ACTION_SENTINEL_PREFIX = "__AI_ACTION__:";
export const aiActionSentinel = (id: string) => `${AI_ACTION_SENTINEL_PREFIX}${id}`;
export const CURSOR_SENTINEL = "\0";

export const PILL_CONTAINER_CLASSES =
  "absolute z-40 flex items-center gap-1 p-1 bg-paper-light dark:bg-paper-dark border border-edge rounded-md shadow-sm pointer-events-auto select-none transition-all duration-200 ease-in-out";

export interface Template {
  label: string;
  icon: string;
  description: string;
  keybind?: string;
  content: string;
  /** Only shown in the command menu when an AI provider/key is configured. */
  aiOnly?: boolean;
}

export const TEMPLATES: Template[] = [
  { label: "Link", icon: "🔗", description: "Insert a hyperlink", keybind: "⌘K", content: LINK_EDITOR_SENTINEL },
  { label: "WikiLink", icon: "[[", description: "Link to another note", content: WIKILINK_EDITOR_SENTINEL },
  { label: "Date", icon: "📅", description: "Pick a date from the calendar", content: DATE_EDITOR_SENTINEL },
  { label: "Table", icon: "⊞", description: "Insert a Markdown table", content: TABLE_DIALOG_SENTINEL },
  {
    label: "Mermaid",
    icon: "⎇",
    description: "Insert a Mermaid diagram block",
    content: `\n\`\`\`mermaid\n${CURSOR_SENTINEL}\n\`\`\`\n`,
  },
  { label: "Task", icon: "☑️", description: "Insert a checklist item", content: `- [ ] ${CURSOR_SENTINEL} #todo` },
  // --- Structure ---
  {
    label: "Callout",
    icon: "📌",
    description: "Note, info, tip, warning, or danger block",
    content: `> [!note]${CURSOR_SENTINEL}\n> `,
  },
  {
    label: "Collapse",
    icon: "🔽",
    description: "Collapsible section for long content",
    content: `> [!note]-${CURSOR_SENTINEL}\n> `,
  },
  // --- AI ---
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
    description: "Open the frontmatter wizard",
    content: FRONTMATTER_WIZARD_SENTINEL,
  },
];
