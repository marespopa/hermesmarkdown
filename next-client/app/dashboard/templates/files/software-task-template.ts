import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();

const SoftwareTaskTemplate: MarkdownTemplate = {
  filename: "task-1",
  frontMatter: {
    title: "Software Task",
    description: `The Software Task Template streamlines software development task tracking, offering sections for task details, links, work description, progress updates, notes, and questions.`,
    tags: "software engineering,task,guide,template",
  },
  content: `# TASK- 

---

## 🖇️ Links

| Type   | Link                               |
|--------|------------------------------------|
| Story  |                                    |
| Docs   |                                    |
| PR     |                                    |

---

## 📝 Description

*Clearly define the problem, goal, or feature. Include context and details to help others understand the task quickly.*
- **Summary**: 
- **Context**: 
- **Problem/Goal**: 
- **Details**: 

---

## 🛑 Non-goals

- 
- 

---

## 🛠️ Solution & Implementation

1. 
2. 
3. 
4. 

---

## 🎯 Acceptance Criteria

| Criteria                                   | Status |
|--------------------------------------------|--------|
|                                            | [ ]    |
|                                            | [ ]    |
|                                            | [ ]    |

---

## 🔗 Dependencies

| Dependency                | Status |
|---------------------------|--------|
|                           | [ ]    |
|                           | [ ]    |

---

## 🚧 Remarks & Open Questions

*Summarize key points and highlight unresolved issues or decisions that need input.*
- Remark: 
- Open Question: 

---

## 📋 Subtasks

| Subtask                   | Status |
|---------------------------|--------|
|                           | [ ]    |
|                           | [ ]    |
|                           | [ ]    |
|                           | [ ]    |

---

## ⏱️ Time Estimate

| Task         | Estimate |
|--------------|----------|
| Total        |          |

---

## 📝 Notes & Additional Information

*Add any extra context or instructions that might be helpful.*
- 
`,
};

export default SoftwareTaskTemplate;
