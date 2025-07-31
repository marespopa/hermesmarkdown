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
|        | [ ]    |            |
|        | [ ]    |            |
|        | [ ]    |            |
---
## 🎯 This Week's Goals
| Goal   | Status | Notes      |
|--------|--------|------------|
|        | [ ]    |            |
|        | [ ]    |            |
|        | [ ]    |            |
---
## 🚀 Current Projects
| Project Name | Status | Due Date | Notes      |
|--------------|--------|----------|------------|
|              | [ ]    |          |            |
|              | [ ]    |          |            |
---
## 💡 Ideas & Notes
- 
- 
- 
---
## 📝 Daily Reflection
**Wins:**
- 
- 

**Challenges:**
- 
- 

**Tomorrow's Focus:**
- 
- 
`,
};

export default ExampleTemplate;
