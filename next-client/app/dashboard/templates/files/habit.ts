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
| Exercise  |  x  |     |  x  |     |  x  |     |     |
| Read      |  x  |  x  |     |     |  x  |     |  x  |
| Meditate  |     |     |     |  x  |     |     |     |
| Journal   |     |     |     |     |     |     |     |

---

## 📈 Progress Summary

| Habit     | Days Completed |
|-----------|----------------|
| Exercise  | 3/7            |
| Read      | 4/7            |
| Meditate  | 1/7            |
| Journal   | 0/7            |

---

## 🎯 Habit Goals

| Habit     | Goal                | Status |
|-----------|---------------------|--------|
| Exercise  | 3 times per week    | [ ]    |
| Read      | 10 min per day      | [ ]    |
| Meditate  | 5 min per day       | [ ]    |
| Journal   | 2 times per week    | [ ]    |

---

## 📝 Notes

**This Week's Wins:**
- Exercised 3 times
- Read every morning

**Next Week's Focus:**
- Meditate more
- Journal twice
`,
};

export default ExampleTemplate;
