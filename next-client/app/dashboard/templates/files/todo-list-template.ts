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

| Task                  | Priority | Status | Notes      |
|-----------------------|----------|--------|------------|
|                       | High     | [ ]    |            |
|                       | High     | [ ]    |            |
|                       | High     | [ ]    |            |

---

## 📝 Regular Tasks

| Task   | Priority | Status | Notes      |
|--------|----------|--------|------------|
|        | Medium   | [ ]    |            |
|        | Medium   | [ ]    |            |
|        | Medium   | [ ]    |            |
|        | Low      | [ ]    |            |
|        | Low      | [ ]    |            |

---

## ✅ Completed Tasks

| Task              | Priority | Status | Notes      |
|-------------------|----------|--------|------------|
|                   | High     | [x]    |            |
|                   | Medium   | [x]    |            |

---

## 📋 Notes

`,
};

export default ToDoListTemplate;
