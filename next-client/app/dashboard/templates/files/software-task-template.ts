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
  content: `# TASK-123 User Login Feature

---

## 🖇️ Links

| Type   | Link                                      |
|--------|--------------------------------------------|
| Story  | https://example.com/story                  |
| Docs   | https://example.com/docs                   |
| PR     | https://github.com/org/repo/pull/1         |

---

## 📝 Description

*Clearly define the problem, goal, or feature. Include context and details to help others understand the task quickly.*
- **Summary**: Implement user authentication for login
- **Context**: Feature X lacks authentication, which is critical for user data protection
- **Problem/Goal**: Ensure secure login for users
- **Details**: Add sequence diagram for login flow

---

## 🛑 Non-goals

- This task does not include frontend UI changes.
- This task does not address API rate limiting.

---

## 🛠️ Solution & Implementation

1. Research and evaluate authentication libraries
2. Integrate chosen library with backend services
3. Write unit tests to ensure functionality
4. Document implementation details in the project wiki

---

## 🎯 Acceptance Criteria

| Criteria                                   | Status |
|--------------------------------------------|--------|
| Users can log in securely using email      | [ ]    |
| Unit tests cover at least 90% of new code  | [ ]    |
| Documentation is updated with login details| [ ]    |

---

## 🔗 Dependencies

| Dependency                | Status |
|---------------------------|--------|
| Approval of spec          | [ ]    |
| Backend ready             | [ ]    |

---

## 🚧 Remarks & Open Questions

*Summarize key points and highlight unresolved issues or decisions that need input.*
- Remark: Ensure API compatibility
- Open Question: Support OAuth2?

---

## 📋 Subtasks

| Subtask                   | Status |
|---------------------------|--------|
| Integrate auth library    | [ ]    |
| Implement backend logic   | [ ]    |
| Write unit tests          | [ ]    |
| Update documentation      | [ ]    |

---

## ⏱️ Time Estimate

| Task         | Estimate |
|--------------|----------|
| Total        | 2 days   |

---

## 📝 Notes & Additional Information

*Add any extra context or instructions that might be helpful.*
- Coordinate with frontend for integration testing
`,
};

export default SoftwareTaskTemplate;
