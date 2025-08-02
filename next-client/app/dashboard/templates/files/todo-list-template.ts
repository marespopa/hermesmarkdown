import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();

const ToDoListTemplate: MarkdownTemplate = {
  filename: "todo-list",
  frontMatter: {
    title: "To Do List",
    description: `A simple checklist for tasks you need to complete.`,
    tags: "todo, list, productivity",
  },
  content: `# To-Do List
**Date:** ${date}

---

## 📋 Tasks

⬜ To Do
🔄 In Progress
🔴 Blocked
✅ Done

---

## 📝 Notes

`,
};

export default ToDoListTemplate;
