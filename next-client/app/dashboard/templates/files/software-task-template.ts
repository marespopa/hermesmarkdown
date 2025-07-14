import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const SoftwareTaskTemplate: MarkdownTemplate = {
  filename: "task-1",
  frontMatter: {
    title: "Software Task",
    description: `The Software Task Template streamlines software development task tracking, offering sections for task details, links, work description, progress updates, notes, and questions.`,
    tags: "software engineering,task,guide,template",
  },
  content: `# [Task-1] Task Title
---
## 🖇️ Links
- Story: [Story Link](#)
- Docs: [Documentation Link](#)
- PR: [Pull Request Link](#)
---
## 📝 Description
*Clearly define the problem, goal, or feature. Include context and details to help others understand the task quickly.*
- **Summary**: Provide a high-level overview of the task (e.g., "Implement user authentication for Feature X").
- **Context**: Explain the current state and why this task is needed (e.g., "Feature X lacks secure login, which is critical for user data protection").
- **Problem/Goal**: State the problem or goal clearly (e.g., "Ensure secure authentication for users").
- **Details**: Add any relevant diagrams, code snippets, or examples to clarify the task.
---
## 🛑 Non-goals
- Example: This task does not include frontend UI changes.
- Example: This task does not address API rate limiting.
---
## 🛠️ Solution & Implementation
1. Research and evaluate authentication libraries.
2. Integrate chosen library with backend services.
3. Write unit tests to ensure functionality.
4. Document implementation details in the project wiki.
---
## 🎯 Acceptance Criteria
*Define what success looks like for this task. Be specific and measurable.*
- Users can log in securely using Feature X.
- Unit tests cover at least 90% of new code.
- Documentation is updated with implementation details.
---
## 🔗 Dependencies
*List any tasks, resources, or approvals required before starting this task.*
- Dependency 1: Approval of design document ([Link](#)).
- Dependency 2: Backend service setup ([Link](#)).
---
## 🚧 Remarks & Open Questions
*Summarize key points and highlight unresolved issues or decisions that need input.*
- Remark: Ensure compatibility with existing APIs.
- Open Question: Should we support OAuth2 in this release?
---
## 📋 Subtasks
*Break down the task into smaller, actionable steps.*
- Research authentication libraries.
- Implement backend integration.
- Write unit tests.
- Update documentation.
---
## ⏱️ Time Estimate
*Provide an estimate for completing this task.*
- Estimated Time: 3 days
---
## 📝 Notes & Additional Information
*Add any extra context or instructions that might be helpful.*
- Note 1: Coordinate with the frontend team for integration testing.`,
};

export default SoftwareTaskTemplate;
