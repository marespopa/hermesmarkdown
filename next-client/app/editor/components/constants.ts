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
    label: "✨ Tutorial",
    content:
      '--- \ntitle: HermesMarkdown Demo\ndate: {date}\nstatus: #todo\n--- \n\n# 🚀 Welcome to HermesMarkdown\nThis is an interactive workspace. Try the features below to get started and explore the full suite of supported commands.\n\n## 🛠 Try the Shortcuts\nExperience real-time conversion by typing these commands:\n- **The Magic Dot**: Type `..d` to instantly stamp the current date.\n- **Live Shortcodes**: Type `{date}`, `{datetime}`, `{iso}`, or `{unix}` for various timestamp formats.\n- **Smart Paste**: Copy a URL and paste it to automatically generate a markdown link. Try **CTRL + Click** on the result to navigate!\n- **Template Menu**: Type `/` to open the quick template menu.\n\n## 💰 Financial Intelligence\nTransform your document into a smart ledger.\n\n**Auto-Budgeting**\nHermesMarkdown automatically sums all currency values found above a line starting with "Total:".\n- BT Credit: $200\n- Groceries: $400\nTotal: $600.00\n\n**Inline Math**\nExecute quick math without leaving the document. Type the expression and close it with an equals sign. \n- `calc(100+50)=150`\n- `calc(24*0.1)=2.4`\n\n## 🔄 Workflow Cycling\nHermesMarkdown uses **Smart Tags** to track progress. Click any tag below to smoothly cycle its status (`#urgn` → `#todo` → `#prog` → `#done`):\n- Hotfix Needed #urgn\n- Initial Research #todo\n- Active Development #prog\n- Project Delivery #done\n\n## 📝 Interactive Lists & Symbols\nManage tasks and insert icons using intuitive commands.\n- [ ] Click to complete this task\n- [x] Completed items will fade out\n- [ ] You can customize the font in settings\n\n**Quick Symbols**\nEnhance your notes with instant shortcode icons:\n- `{check}` renders ✅\n- `{error}` renders ❌\n- `{idea}` renders 💡\n- `{warn}` renders ⚠️\n- `{fix}` renders 🛠️\n- `{bug}` renders 🐛\n- `{star}` renders ⭐\n\n> 💡 TIP\n> Hover your cursor in the **top right corner** to reveal the settings menu.\n\n---\n\n*Drafted with 🧡 in HermesMarkdown*',
  },
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
