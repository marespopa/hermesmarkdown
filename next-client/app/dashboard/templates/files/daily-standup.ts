import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const DailyStandupTemplate: MarkdownTemplate = {
  filename: "daily-standup",
  frontMatter: {
    title: "Daily Standup Status",
    description: `A note about your daily standup status`,
    tags: "daily,engineering,status,meeting",
  },
  content: `# 🗓️ Daily Standup

**Date:** ${date}

---

## ✅ Yesterday's Accomplishments
- [Accomplishment 1]
- [Accomplishment 2]
- [Accomplishment 3]

---

## 🎯 Today's Plan
- [ ] [Task 1]
- [ ] [Task 2]
- [ ] [Task 3]

---

## 🚧 Blockers & Issues
- [Blocker 1]
- [Blocker 2]

---

## 📝 Notes
[Any additional notes or suggestions]`,
};

export default DailyStandupTemplate;
