import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();

const ProjectManagementTemplate: MarkdownTemplate = {
  filename: "project-management-template",
  frontMatter: {
    title: "Project Management",
    description: `Ideal for managing and planning projects effectively`,
    tags: "project, project management, productivity",
  },
  content: `# 📋 Project Management
**Created:** ${date}

---

## 🎯 Project Details

| Field         | Value              |
|---------------|--------------------|
| Project Name  | [Project Name]     |
| Description   | [Project Description] |
| Owner         | [Project Owner]    |
| Start Date    | [Start Date]       |
| End Date      | [End Date]         |

---

## 📊 Project Goals

| Goal      | Status | Notes         |
|-----------|--------|--------------|
| Goal 1    | [ ]    |              |
| Goal 2    | [ ]    |              |
| Goal 3    | [ ]    |              |

---

## 👥 Team & Stakeholders

| Name      | Role         | Contact        |
|-----------|-------------|----------------|
| Name 1    | [Role]      | [Contact]      |
| Name 2    | [Role]      | [Contact]      |
| Name 3    | [Role]      | [Contact]      |

---

## ✅ Tasks & Milestones

| Phase     | Task         | Due Date   | Owner      | Status |
|-----------|--------------|------------|------------|--------|
| Phase 1   | Task 1       | [Date]     | [Name]     | [ ]    |
| Phase 1   | Task 2       | [Date]     | [Name]     | [ ]    |
| Phase 1   | Task 3       | [Date]     | [Name]     | [ ]    |
| Phase 2   | Task 1       | [Date]     | [Name]     | [ ]    |
| Phase 2   | Task 2       | [Date]     | [Name]     | [ ]    |

---

## 💰 Budget

| Item         | Amount   |
|--------------|----------|
| Total Budget | $[Amount]|
| Spent        | $[Amount]|
| Remaining    | $[Amount]|

---

## ⚠️ Risks & Issues

| Risk/Issue         | Impact   | Mitigation Plan         | Status |
|--------------------|----------|------------------------|--------|
| [Risk/Issue 1]     | [Impact] | [Mitigation Plan]      | [ ]    |
| [Risk/Issue 2]     | [Impact] | [Mitigation Plan]      | [ ]    |

---

## 📅 Timeline

| Milestone      | Date       | Description         |
|---------------|------------|---------------------|
| Milestone 1   | [Date]     | [Description]       |
| Milestone 2   | [Date]     | [Description]       |
| Milestone 3   | [Date]     | [Description]       |

---

## 📝 Notes

[Add project-specific notes, decisions, or important information here]
`,
};

export default ProjectManagementTemplate;
