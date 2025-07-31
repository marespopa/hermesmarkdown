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

## 📋 Agenda

- 
-  

---

## 📝 Discussion Notes

*Add your notes here*

---

## ✅ Action Items

- [ ] 

---

## 📆 Next Meeting

**Date:** 
**Time:** 
**Agenda:** 
`,
};

export default MeetingNotesTemplate;
