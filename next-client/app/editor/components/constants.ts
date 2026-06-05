export const SUBTLE =
  'class="text-zinc-500/20 dark:text-zinc-400/10 select-none"';
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
  // --- Obsidian / Daily Driver ---
  {
    label: "🗓️ Daily Note",
    content:
      "# {day}, {date}\n> 📅 Week: {week}\n\n## 📓 Journal\n\n\n## ✅ Tasks\n- [ ] \n- [ ] \n- [ ] \n\n## 🔗 Links\n- [[{date}]]\n\n#todo",
  },
  {
    label: "📋 Meeting Notes",
    content:
      "# Meeting – {date}\n> 🕐 {time}\n> 📌 Topic: \n\n## 👥 Attendees\n- \n\n## 📋 Agenda\n- \n\n## ✅ Decisions\n- \n\n## 🎯 Action Items\n- [ ]  #todo\n- [ ]  #todo",
  },
  {
    label: "🧠 Atomic Note",
    content:
      "# \n> 📅 {date}  ·  Source: [[]]\n\n## Summary\n\n\n## Key Ideas\n- \n- \n\n## Links\n- [[]]\n- [[]]",
  },
  {
    label: "📆 Weekly Review",
    content:
      "# Weekly Review – {week}\n> 📅 {date}\n\n## 🏆 Wins\n- \n\n## 🔄 Carry-overs\n- [ ]  #wait\n- [ ]  #wait\n\n## 🎯 Next Week\n- [ ]  #todo\n- [ ]  #todo\n- [ ]  #todo\n\n## 💡 Reflection\n",
  },
  // --- Writing (iAWriter) ---
  {
    label: "✍️ Essay",
    content:
      "# Title\n> {date}\n\n## Lead\n\n\n## Body\n\n### \n\n### \n\n## Closing\n",
  },
  // --- Productivity ---
  {
    label: "📄 Frontmatter",
    content: "---\ntitle: \ndate: {date}\nday: {day}\nweek: {week}\ntags: #tag\n---",
  },
  {
    label: "📝 To-Do List",
    content:
      "# ✏️ To-Do – {date}\n\n## 🎯 Priority\n- [ ]  #urgn\n- [ ]  #urgn\n\n## 📋 Tasks\n- [ ]  #todo\n- [ ]  #todo\n- [ ]  #todo\n\n## ✅ Done\n- [x] Example task #done",
  },
  {
    label: "📝 Notes",
    content:
      "# {day}, {date} – Notes\n\n## Summary\n\n\n## Actions\n- [ ] \n- [ ] ",
  },
  // --- Dev ---
  {
    label: "💻 Dev Sprint",
    content:
      "# 🛠️ Dev Log – {date}\n> 📅 Week: {week}\n> 🎯 Focus: \n\n## 🚀 Changes\n- [ ] Update  #todo\n- [ ] Refactor  #todo\n\n## 🐛 Bugs\n- [ ] Issue description  #urgn\n- See also: [[]]\n\nstatus: #prog",
  },
  {
    label: "🤖 AI Prompt",
    content:
      "# AI Prompt – {date}\n\n## Objective\n\n\n## Context\n\n\n## Data\n\n\n## Output Format\n",
  },
  // --- Personal ---
  {
    label: "💰 Financial Plan",
    content:
      "# 📊 Monthly Allocation\n\n## 🏦 Credit Management\n- Credit Card: -$200\n- Bank Loan: -$150\n- Other Credit: -$100\n\n## 🛒 Variable Spending\n- Groceries: $400\n- Dining: $150\n- Transport: $100\n- Other Expenses: $100\n\n---\nTotal: $1250 (Auto-calculated)\n\n> 💡 Tip: Update the values above and the total will be automatically calculated.",
  },
  {
    label: "💪 Gym Log",
    content:
      "# 🏋️ Workout – {day}\n> 📅 {date}\n> ⚡ Split: (Push / Pull / Legs / Upper / Lower)\n\n## 🏃 Exercises\n- [ ] \n- [ ] \n- [ ] ",
  },
  {
    label: "🗂️ Kanban Board",
    content:
      "# 🗂️ Kanban – {date}\n\n## 🔴 Urgent\n- [ ] Task  #urgn\n- [ ] Task  #urgn\n\n## 📋 To Do\n- [ ] Task  #todo\n- [ ] Task  #todo\n- [ ] Task  #todo\n\n## 🔄 In Progress\n- [ ] Task  #prog\n- [ ] Task  #prog\n\n## ⏳ Waiting\n- [ ] Task  #wait\n\n## ✅ Done\n- [x] Example task  #done",
  },
];
