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
**Time:** 
**Location:** 

---

## 👥 Attendees

| Name   |
|--------|
|        |
|        |
|        |

---

## 📋 Agenda

| Agenda Item     |
|-----------------|
|                 |
|                 |
|                 |

---

## 📝 Discussion Notes

### 
- Key Points: 
- Decisions: 
- Action Items: 

### 
- Key Points: 
- Decisions: 
- Action Items: 

---

## ✅ Action Items

| Action Item         | Owner | Due Date | Status |
|---------------------|-------|----------|--------|
|                     |       |          | [ ]    |
|                     |       |          | [ ]    |

---

## 📆 Next Meeting

| Field  | Value         |
|--------|---------------|
| Date   |               |
| Time   |               |
| Agenda |               |
`,
};

export default MeetingNotesTemplate;
