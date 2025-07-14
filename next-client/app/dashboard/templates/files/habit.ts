import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const ExampleTemplate: MarkdownTemplate = {
  filename: "habit-tracker",
  frontMatter: {
    title: "Habit Tracker",
    description: `An easy way to track habits.`,
    tags: "habit,productivity,tracker",
  },
  content: `# 🌟 Habit Tracker
**Created:** ${date}
---
## 🔄 Weekly Habits
- Exercise: [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]
- Read: [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]
- Meditate: [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]
- Journal: [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]
---
## 📊 Progress Summary
- **Exercise:** [X]/7 days
- **Read:** [X]/7 days
- **Meditate:** [X]/7 days
- **Journal:** [X]/7 days
---
## 🎯 Habit Goals
- [ ] **Exercise:** [X] times per week
- [ ] **Read:** [X] minutes per day
- [ ] **Meditate:** [X] minutes per day
- [ ] **Journal:** [X] times per week
---
## 📝 Notes
**This Week's Wins:**
- [Win 1]
- [Win 2]
**Next Week's Focus:**
- [Focus area 1]
- [Focus area 2]`,
};

export default ExampleTemplate;
