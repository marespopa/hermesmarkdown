import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const ToDoListTemplate: MarkdownTemplate = {
  filename: "todo-list",
  frontMatter: {
    title: "To Do List",
    description: `A simple checklist for tasks you need to complete.`,
    tags: "todo, list, productivity",
  },
  content: `# ✅ To-Do List

**Created:** ${date}

---

## 🎯 Priority Tasks
- [ ] [High Priority Task 1]
- [ ] [High Priority Task 2]
- [ ] [High Priority Task 3]

---

## 📝 Regular Tasks
- [ ] [Task 1]
- [ ] [Task 2]
- [ ] [Task 3]
- [ ] [Task 4]
- [ ] [Task 5]

---

## ✅ Completed Tasks
- [x] [Completed Task 1]
- [x] [Completed Task 2]

---

## 📋 Notes
[Add any notes, reminders, or details about your tasks here]`,
};

export default ToDoListTemplate;
