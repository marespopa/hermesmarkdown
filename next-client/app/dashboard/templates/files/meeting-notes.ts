import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

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
**Time:** [Time]
**Location:** [Location]

---

## 👥 Attendees
- [Name 1]
- [Name 2]
- [Name 3]

---

## 📋 Agenda
1. [Agenda Item 1]
2. [Agenda Item 2]
3. [Agenda Item 3]

---

## 📝 Discussion Notes
### [Agenda Item 1]
- **Key Points:** [Summary of discussion]
- **Decisions:** [Decisions made]
- **Action Items:** [Follow-up tasks]

### [Agenda Item 2]
- **Key Points:** [Summary of discussion]
- **Decisions:** [Decisions made]
- **Action Items:** [Follow-up tasks]

---

## ✅ Action Items
- [ ] **[Action Item 1]** - Owner: [Name] - Due: [Date]
- [ ] **[Action Item 2]** - Owner: [Name] - Due: [Date]

---

## 📆 Next Meeting
- **Date:** [Date]
- **Time:** [Time]
- **Agenda:** [Preliminary agenda items]`,
};

export default MeetingNotesTemplate;
