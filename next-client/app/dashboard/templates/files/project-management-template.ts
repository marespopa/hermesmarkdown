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

| Field         | Value                |
|---------------|----------------------|
| Project Name  |                      |
| Description   |                      |
| Owner         |                      |
| Start Date    |                      |
| End Date      |                      |

---

## 📊 Project Goals

| Goal   | Status | Notes      |
|--------|--------|------------|
|        | [ ]    |            |
|        | [ ]    |            |
|        | [ ]    |            |

---

## 👥 Team & Stakeholders

| Name   | Role   | Contact    |
|--------|--------|------------|
|        |        |            |
|        |        |            |
|        |        |            |

---

## ✅ Tasks & Milestones

| Phase   | Task   | Due Date | Owner  | Status |
|---------|--------|----------|--------|--------|
|         |        |          |        | [ ]    |
|         |        |          |        | [ ]    |
|         |        |          |        | [ ]    |
|         |        |          |        | [ ]    |
|         |        |          |        | [ ]    |

---

## 💰 Budget

| Item         | Amount   |
|--------------|----------|
| Total Budget | $        |
| Spent        | $        |
| Remaining    | $        |

---

## ⚠️ Risks & Issues

| Risk/Issue     | Impact   | Mitigation Plan    | Status |
|----------------|----------|--------------------|--------|
|                |          |                    | [ ]    |
|                |          |                    | [ ]    |

---

## 📅 Timeline

| Milestone    | Date       | Description   |
|--------------|------------|---------------|
|              |            |               |
|              |            |               |
|              |            |               |

---

## 📝 Notes

`,
};

export default ProjectManagementTemplate;
