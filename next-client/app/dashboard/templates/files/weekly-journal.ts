import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const dateWithLines = getDate(new Date(), '-');
const date = getDate();

const WeeklyJournalTemplate: MarkdownTemplate = {
  filename: `journal-${dateWithLines}`,
  frontMatter: {
    title: "Weekly Journal",
    description: `A note about how your week went`,
    tags: "journal,weekly,notes",
  },
  content: `**📅 Date:** ${date}

# 🌟 Title  

---

## 📝 Reflection  
Write about your week here.  

---

## 🙏 Gratitude  
I am thankful for:  

---

## 🎯 Focus for Next Week  
One goal:  

---

## 📈 Mood  
- Mood: 😀 | 🙂 | 😐 | 😔 | 😢  
- Energy: 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ `
};

export default WeeklyJournalTemplate;
