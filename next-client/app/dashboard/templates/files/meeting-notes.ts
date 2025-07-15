import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();

const MeetingNotesTemplate: MarkdownTemplate = {
  filename: "meeting-notes",
  frontMatter: {
    title: "Meeting Notes",
    description: `A structured template to document meeting agendas, discussions, and outcomes. 
Simplifies organizing and tracking action items for effective follow-ups.`,
    tags: "meeting,notes",
  },
  content: `# 🗓️ Meeting Notes
**Date:** ${date}
**Time:** 10:00 AM
**Location:** Conference Room

---

## 👥 Attendees

| Name   |
|--------|
| Alice  |
| Bob    |
| Carol  |

---

## 📋 Agenda

| Agenda Item     |
|-----------------|
| Project Kickoff |
| Timeline Review |
| Q&A             |

---

## 📝 Discussion Notes

### Project Kickoff
- Key Points: Introduced project goals
- Decisions: Agreed on scope
- Action Items: Assign tasks

### Timeline Review
- Key Points: Reviewed milestones
- Decisions: Adjusted deadlines
- Action Items: Update project plan

---

## ✅ Action Items

| Action Item         | Owner | Due Date | Status |
|---------------------|-------|----------|--------|
| Create project repo | Alice | ${date}  | [ ]    |
| Update timeline     | Bob   | ${date}  | [ ]    |

---

## 📆 Next Meeting

| Field  | Value         |
|--------|---------------|
| Date   | ${date}       |
| Time   | 2:00 PM       |
| Agenda | Progress Check|
`,
};

export default MeetingNotesTemplate;
