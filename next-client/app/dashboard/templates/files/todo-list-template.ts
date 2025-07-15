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
  content: `# ✅ To-Do List
**Created:** ${date}

---

## 🎯 Priority Tasks

| Task                  | Priority | Status | Notes         |
|-----------------------|----------|--------|--------------|
| High Priority Task 1  | High     | [ ]    |              |
| High Priority Task 2  | High     | [ ]    |              |
| High Priority Task 3  | High     | [ ]    |              |

---

## 📝 Regular Tasks

| Task     | Priority | Status | Notes         |
|----------|----------|--------|--------------|
| Task 1   | Medium   | [ ]    |              |
| Task 2   | Medium   | [ ]    |              |
| Task 3   | Medium   | [ ]    |              |
| Task 4   | Low      | [ ]    |              |
| Task 5   | Low      | [ ]    |              |

---

## ✅ Completed Tasks

| Task              | Priority | Status | Notes         |
|-------------------|----------|--------|--------------|
| Completed Task 1  | High     | [x]    |              |
| Completed Task 2  | Medium   | [x]    |              |

---

## 📋 Notes

[Add any notes, reminders, or details about your tasks here]
`,
};

export default ToDoListTemplate;
