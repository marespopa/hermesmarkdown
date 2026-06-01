export const SUBTLE =
  'class="text-neutral-500/30 dark:text-neutral-400/20 select-none"';
export const WORKFLOW_TAGS = ["todo", "prog", "done", "urgn", "wait"];
export const TAG_COLORS: Record<string, string> = {
  todo: "text-blue-600 dark:text-blue-400",
  prog: "text-amber-600 dark:text-amber-400",
  done: "text-green-600 dark:text-green-400",
  urgn: "text-red-600 dark:text-red-400",
  wait: "text-purple-600 dark:text-purple-400",
};
export const TAG_CYCLE: Record<string, string> = {
  urgn: "todo",
  todo: "prog",
  prog: "done",
  done: "todo",
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

export const TEMPLATES = [
  {
    label: "📄 Frontmatter",
    content: "---\ntitle: \ndate: {date}\ntags: #tag\n---",
  },
  {
    label: "📝 To-Do List",
    content:
      "# To-Do List ✏️\n-   Task\n- [x] Completed Task\n\n## Priority Tasks 🎯\n-   Task",
  },
  {
    label: "💻 Dev Sprint",
    content:
      "# 🛠️ Development Log\n> 📅 Date: {date}\n> 🎯 Focus: \n\n## 🚀 Changes\n-   Update \n-   Refactor \n\n## 🐛 Bugs to Fix\n-   Issue description #urgn\n\nstatus: #prog",
  },
  {
    label: "📝 Notes",
    content: "# {date} Notes\n\n## Summary\n\n\n## Actions\n- [ ] ",
  },
  {
    label: "🤖 AI Prompt",
    content:
      "## Objective\n\n\n## Context\n\n\n## Data\n\n\n## Output Format\n",
  },
  {
    label: "💰 Financial Plan",
    content:
      "# 📊 Monthly Allocation\n\n## 🏦 Credit Management\n- Credit Card: -$200\n- Bank Loan: -$150\n- Other Credit: -$100\n\n## 🛒 Variable Spending\n- Groceries: $400\n- Dining: $150\n- Transport: $100\n- Other Expenses: $100\n\n---\nTotal: $1250 (Auto-calculated)\n\n> 💡 Tip: Update the values above and the total will be automatically calculated.",
  },
  {
    label: "💪 Gym Log",
    content:
      "# 🏋️ Workout\n> 📅 Date: {date}\n> ⚡ Split: (Push / Pull / Legs / Upper / Lower)\n\n## 🏃 Exercises\n-   Exercise \n-   Exercise \n-   Exercise ",
  },
];
