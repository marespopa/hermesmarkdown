import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const ExampleTemplate: MarkdownTemplate = {
  filename: "dashboard",
  frontMatter: {
    title: "Dashboard",
    description: `An organized template tailored to effectively manage tasks and projects.`,
    tags: "software,tasks,dashboard",
  },
  content: `# 🧠 Dashboard
**Created:** ${date}
---
## ✅ Today's Tasks
- [ ] [Task 1]
- [ ] [Task 2]
- [ ] [Task 3]
---
## 🎯 This Week's Goals
- [ ] [Goal 1]
- [ ] [Goal 2]
- [ ] [Goal 3]
---
## 🚀 Current Projects
- [ ] [Project Name] - [Status] - Due: [Date]
- [ ] [Project Name] - [Status] - Due: [Date]
---
## 💡 Ideas & Notes
- [Idea 1]
- [Idea 2]
- [Idea 3]
---
## 📝 Daily Reflection
**Wins:**
- [Win 1]
- [Win 2]
**Challenges:**
- [Challenge 1]
- [Challenge 2]
**Tomorrow's Focus:**
- [Focus area 1]
- [Focus area 2]`,
};

export default ExampleTemplate;
