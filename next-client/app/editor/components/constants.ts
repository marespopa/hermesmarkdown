export const SUBTLE =
  'class="text-neutral-500/30 dark:text-neutral-400/20 select-none"';
export const WORKFLOW_TAGS = ["todo", "prog", "done", "urgn", "wait"];
export const TAG_COLORS = {
  todo: "text-blue-600 dark:text-blue-400",
  prog: "text-amber-600 dark:text-amber-400",
  done: "text-green-600 dark:text-green-400",
  urgn: "text-red-600 dark:text-red-400",
  wait: "text-purple-600 dark:text-purple-400",
};
export const TAG_CYCLE = {
  urgn: "todo",
  todo: "prog",
  prog: "done",
  done: "todo",
};

export const SHORTCODES = {
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
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
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
      "--- \ntitle: Hermes Markdown Demo\ndate: {date}\nstatus: #todo\n--- \n\n# 🚀 Welcome to Hermes\nThis is an interactive workspace. Try the features below to get started.\n\n## 🛠 Try the Shortcuts\nExperience real-time conversion by typing these commands:\n- **The Magic Dot**: Type `.\u200c.d` here:  \n- **Live Shortcodes**: Type `{\u200cdate}` or `{\u200ctime}` here:  \n- **Smart Paste**: Copy this url: `https://www.marespopa.com` and paste it here to auto-wrap it in a markdown link. Try **CTRL + Click** on the result to visit it!\n\n## 🔄 Workflow Cycling\nHermes uses **Smart Tags** to track progress. Click the tags below to cycle their status:\n- Initial Research #todo\n- Active Development #prog\n- Hotfix Needed #urgn\n- Project Delivery #done\n\n## 📝 Interactive Lists\nClick the brackets below to see the completion effect:\n- [ ] Click to complete this task\n- [x] Completed items will fade out\n- [ ] You can customize the font in settings\n\n> 💡 TIP\n> Hover your cursor in the **top right corner** to reveal the settings menu.\n\n---\n\n*Drafted with 🧡 in Hermes Markdown*",
  },
  {
    label: "📝 To-Do List",
    content:
      "# To-Do List ✏️\n- [ ] Task\n- [x] Task\n\n## Priority Tasks 🎯\n- [ ] Task",
  },
  {
    label: "🤖 AI Prompt",
    content:
      "## Objective\n\n\n## Context\n\n\n## Data\n\n\n## Output Format\n",
  },
  {
    label: "⚡ Quick Idea",
    content:
      "# ⚡ Brain Dump\n\n## The Big Idea 💡\n \n\n## Key Details 🔍\n \n \n \n\n## Next Steps 🚀\n \n \n",
  },
  {
    label: "💪 Gym Helper",
    content:
      "# 🏋️ Workout\n> 🔓 Locker: \n> 📅 Date: {date}\n> ⚡ Workout Type: \n\n## 🏃 Exercises\n- Exercise  #todo",
  },
  {
    label: "💰 Budget Planner",
    content:
      "# 📊 Monthly Budget\n\n## 🏦 Fixed Expenses\n- Rent: $1200\n- Utilities: $150\n- Internet: $60\n\n## 🛒 Variable Spending\n- Groceries: $400\n- Dining: $200\n- Transport: $100\n\n---\nTotal: $0.00\n\n> 💡 Tip: Change any value above (e.g., $450) and the Total will update automatically.",
  },
  {
    label: "📄 Frontmatter",
    content: "---\ntitle: \ndate: {date}\nstatus: #todo\n---",
  },
];
