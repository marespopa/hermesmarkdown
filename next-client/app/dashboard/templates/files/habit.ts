import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();

const ExampleTemplate: MarkdownTemplate = {
  filename: "habit-tracker",
  frontMatter: {
    title: "Habit Tracker",
    description: `An easy way to track habits.`,
    tags: "habit,productivity,tracker",
  },
  content: `# 🌟 Habit Tracker

**Created:** ${date}

---

## 🔄 Weekly Habits

| Habit     | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|-----------|-----|-----|-----|-----|-----|-----|-----|
|           |     |     |     |     |     |     |     |
|           |     |     |     |     |     |     |     |
|           |     |     |     |     |     |     |     |
|           |     |     |     |     |     |     |     |

---

## 📈 Progress Summary

| Habit     | Days Completed |
|-----------|----------------|
|           | /7             |
|           | /7             |
|           | /7             |
|           | /7             |

---

## 🎯 Habit Goals

| Habit     | Goal                | Status |
|-----------|---------------------|--------|
|           |                     | [ ]    |
|           |                     | [ ]    |
|           |                     | [ ]    |
|           |                     | [ ]    |

---

## 📝 Notes

**This Week's Wins:**
- 
- 

**Next Week's Focus:**
- 
- 
`,
};

export default ExampleTemplate;
