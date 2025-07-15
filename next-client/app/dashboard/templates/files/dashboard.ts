import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();

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
| Task   | Status | Notes      |
|--------|--------|------------|
| Task 1 | [ ]    |            |
| Task 2 | [ ]    |            |
| Task 3 | [ ]    |            |
---
## 🎯 This Week's Goals
| Goal   | Status | Notes      |
|--------|--------|------------|
| Goal 1 | [ ]    |            |
| Goal 2 | [ ]    |            |
| Goal 3 | [ ]    |            |
---
## 🚀 Current Projects
| Project Name | Status | Due Date | Notes      |
|--------------|--------|----------|------------|
| Project 1    | [ ]    | [Date]   |            |
| Project 2    | [ ]    | [Date]   |            |
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
- [Focus area 2]
`,
};

export default ExampleTemplate;
