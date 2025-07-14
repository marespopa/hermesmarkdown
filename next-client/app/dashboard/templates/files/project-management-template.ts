import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

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
- Project Name: [Project Name]
- Description: [Project Description]
- Owner: [Project Owner]
- Start Date: [Start Date]
- End Date: [End Date]
---
## 📊 Project Goals
- [ ] [Goal 1]
- [ ] [Goal 2]
- [ ] [Goal 3]
---
## 👥 Team & Stakeholders
- [Name] - [Role] - [Contact]
- [Name] - [Role] - [Contact]
- [Name] - [Role] - [Contact]
---
## ✅ Tasks & Milestones
- Phase 1: [Phase Name]
  - [ ] [Task 1] - Due: [Date] - Owner: [Name]
  - [ ] [Task 2] - Due: [Date] - Owner: [Name]
  - [ ] [Task 3] - Due: [Date] - Owner: [Name]
- Phase 2: [Phase Name]
  - [ ] [Task 1] - Due: [Date] - Owner: [Name]
  - [ ] [Task 2] - Due: [Date] - Owner: [Name]
---
## 💰 Budget
- Total Budget: $[Amount]
- Spent: $[Amount]
- Remaining: $[Amount]
---
## ⚠️ Risks & Issues
- [ ] [Risk/Issue] - [Impact] - [Mitigation Plan]
- [ ] [Risk/Issue] - [Impact] - [Mitigation Plan]
---
## 📅 Timeline
- Milestone 1: [Date] - [Description]
- Milestone 2: [Date] - [Description]
- Milestone 3: [Date] - [Description]
---
## 📝 Notes
[Add project-specific notes, decisions, or important information here]
`,
};

export default ProjectManagementTemplate;
