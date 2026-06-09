export const SUBTLE =
  'class="text-zinc-500/20 dark:text-zinc-400/10 select-none"';
// Document lifecycle states — mirrors the `status:` frontmatter field so inline tags
// carry the same semantic weight as structured metadata.
export const WORKFLOW_TAGS = ["draft", "review", "active", "archived"];
export const TODO_TAGS = ["todo", "prog", "done"];
export const TAG_COLORS: Record<string, string> = {
  draft:    "text-amber-600 dark:text-amber-400",
  review:   "text-sage dark:text-sage",
  active:   "text-emerald-600 dark:text-emerald-400",
  archived: "text-ink-muted dark:text-stone",
  todo:     "text-sage dark:text-sage",
  prog:     "text-orange-500 dark:text-orange-400",
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
  prog: "done",
  done: "todo",
};
export const TODO_CYCLE_PREV: Record<string, string> = {
  todo: "done",
  prog: "todo",
  done: "prog",
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
export const AI_IMPROVE_SENTINEL = "__AI_IMPROVE__";
export const AI_EXPAND_SENTINEL = "__AI_EXPAND__";
export const CURSOR_SENTINEL = "\0";

export const PILL_CONTAINER_CLASSES =
  "absolute z-40 flex items-center gap-1 p-1 bg-paper-light dark:bg-paper-dark border border-edge rounded-md shadow-sm pointer-events-auto select-none transition-all duration-200 ease-in-out";

export interface Template {
  label: string;
  icon: string;
  description: string;
  keybind?: string;
  content: string;
}

export const TEMPLATES: Template[] = [
  { label: "Link", icon: "🔗", description: "Insert a hyperlink", keybind: "⌘K", content: LINK_EDITOR_SENTINEL },
  { label: "WikiLink", icon: "[[", description: "Link to another note", content: WIKILINK_EDITOR_SENTINEL },
  { label: "Date", icon: "📅", description: "Pick a date from the calendar", content: DATE_EDITOR_SENTINEL },
  { label: "Table", icon: "⊞", description: "Insert a Markdown table", content: TABLE_DIALOG_SENTINEL },
  // --- Obsidian / Daily Driver ---
  {
    label: "Daily Note",
    icon: "🗓️",
    description: "Journal, tasks, and links for today",
    content: "# {day}, {date}\n> 📅 Week: {week}\n\n## 📓 Journal\n\n\n## ✅ Tasks\n- [ ] \n- [ ] \n- [ ] \n\n## 🔗 Links\n- [[{date}]]\n\n#todo",
  },
  {
    label: "Meeting Notes",
    icon: "📋",
    description: "Agenda, decisions, and action items",
    content: "# Meeting – {date}\n> 🕐 {time}\n> 📌 Topic: \n\n## 👥 Attendees\n- \n\n## 📋 Agenda\n- \n\n## ✅ Decisions\n- \n\n## 🎯 Action Items\n- [ ]  #todo\n- [ ]  #todo",
  },
  {
    label: "Atomic Note",
    icon: "🧠",
    description: "Zettelkasten-style single idea",
    content: "# \n> 📅 {date}  ·  Source: [[]]\n\n## Summary\n\n\n## Key Ideas\n- \n- \n\n## Links\n- [[]]\n- [[]]",
  },
  {
    label: "Weekly Review",
    icon: "📆",
    description: "Wins, carry-overs, and next week goals",
    content: "# Weekly Review – {week}\n> 📅 {date}\n\n## 🏆 Wins\n- \n\n## 🔄 Carry-overs\n- [ ]  #wait\n- [ ]  #wait\n\n## 🎯 Next Week\n- [ ]  #todo\n- [ ]  #todo\n- [ ]  #todo\n\n## 💡 Reflection\n",
  },
  // --- Writing ---
  {
    label: "Essay",
    icon: "✍️",
    description: "Lead, body, and closing structure",
    content: "# Title\n> {date}\n\n## Lead\n\n\n## Body\n\n### \n\n### \n\n## Closing\n",
  },
  // --- Productivity ---
  {
    label: "Frontmatter",
    icon: "📄",
    description: "Open the frontmatter wizard",
    content: FRONTMATTER_WIZARD_SENTINEL,
  },
  {
    label: "To-Do List",
    icon: "📝",
    description: "Priority and task checklist",
    content: "# ✏️ To-Do – {date}\n\n## 🎯 Priority\n- [ ]  #urgn\n- [ ]  #urgn\n\n## 📋 Tasks\n- [ ]  #todo\n- [ ]  #todo\n- [ ]  #todo\n\n## ✅ Done\n- [x] Example task #done",
  },
  {
    label: "Notes",
    icon: "📝",
    description: "Summary and quick actions",
    content: "# {day}, {date} – Notes\n\n## Summary\n\n\n## Actions\n- [ ] \n- [ ] ",
  },
  // --- Dev ---
  {
    label: "Dev Sprint",
    icon: "💻",
    description: "Changes, bugs, and dev log",
    content: "# 🛠️ Dev Log – {date}\n> 📅 Week: {week}\n> 🎯 Focus: \n\n## 🚀 Changes\n- [ ] Update  #todo\n- [ ] Refactor  #todo\n\n## 🐛 Bugs\n- [ ] Issue description  #urgn\n- See also: [[]]\n\nstatus: #prog",
  },
  {
    label: "AI Prompt",
    icon: "🤖",
    description: "Objective, context, and output format",
    content: "# AI Prompt – {date}\n\n## Objective\n\n\n## Context\n\n\n## Data\n\n\n## Output Format\n",
  },
  // --- Personal ---
  {
    label: "Financial Plan",
    icon: "💰",
    description: "Monthly budget allocation",
    content: "# 📊 Monthly Allocation\n\n## 🏦 Credit Management\n- Credit Card: -$200\n- Bank Loan: -$150\n- Other Credit: -$100\n\n## 🛒 Variable Spending\n- Groceries: $400\n- Dining: $150\n- Transport: $100\n- Other Expenses: $100\n\n---\nTotal: $1250 (Auto-calculated)\n\n> 💡 Tip: Update the values above and the total will be automatically calculated.",
  },
  {
    label: "Gym Log",
    icon: "💪",
    description: "Workout split and exercise tracker",
    content: "# 🏋️ Workout – {day}\n> 📅 {date}\n> ⚡ Split: (Push / Pull / Legs / Upper / Lower)\n\n## 🏃 Exercises\n- [ ] \n- [ ] \n- [ ] ",
  },
  {
    label: "Kanban Board",
    icon: "🗂️",
    description: "Draft, review, active, archived lifecycle board",
    content: "# 🗂️ Kanban – {date}\n\n## 📝 Draft\n- [ ] Task  #draft\n- [ ] Task  #draft\n\n## 🔍 Review\n- [ ] Task  #review\n- [ ] Task  #review\n\n## ✅ Active\n- [x] Task  #active\n\n## 🗄️ Archived\n- [x] Example task  #archived",
  },
  // --- Agent / Prompt Engineering ---
  {
    label: "Agent",
    icon: "🧩",
    description: "Role, goal, and constraints block",
    content: "<AGENT>\n  role: \n  goal: \n  constraints:\n    - \n    - \n</AGENT>\n",
  },
  {
    label: "Role",
    icon: "🎭",
    description: "Persona definition block",
    content: "<ROLE>\n  You are a \n  Your expertise: \n  Tone: \n</ROLE>\n",
  },
  {
    label: "Context",
    icon: "📦",
    description: "Context wrapper block",
    content: "<CONTEXT>\n\n</CONTEXT>\n",
  },
  {
    label: "Constraints",
    icon: "🚧",
    description: "Do-not / always / format rules",
    content: "<CONSTRAINTS>\n  - Do not \n  - Always \n  - Output format: \n</CONSTRAINTS>\n",
  },
  {
    label: "Output",
    icon: "📤",
    description: "Output format specification",
    content: "<OUTPUT_FORMAT>\n  format: \n  length: \n  language: \n  example:\n    \n</OUTPUT_FORMAT>\n",
  },
];
