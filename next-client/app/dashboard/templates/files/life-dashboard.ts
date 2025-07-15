import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();

const LifeDashboardTemplate: MarkdownTemplate = {
  filename: "life-dashboard",
  frontMatter: {
    title: "Life Dashboard",
    description: `A comprehensive dashboard that combines work, health, finance, learning, and personal goals in one organized view.`,
    tags: "dashboard,life,productivity,goals,health,finance,learning",
  },
  content: `# 🌟 Life Dashboard

**Created:** ${date}

---

## 🎯 This Week's Focus

| Primary Goal        | Success Metric          |
|---------------------|-------------------------|
| Finish project      | 100% complete           |

---

## 💼 Work & Career

| Project             | Status | Due Date   | Notes         |
|---------------------|--------|------------|---------------|
| Project 1           | [ ]    | Mar 15     | Launch MVP    |
| Project 2           | [ ]    | Mar 30     | QA review     |
| Skill Building      | [ ]    |            | React course  |
| _Work-Life Balance_ |        |            | 40h / 5h / 6  |

---

## 💰 Finance & Budget

| Category        | Amount       |
|-----------------|--------------|
| Income          | $3200        |
| Expenses        | $2000        |
| Savings         | $1000        |
|                 |              |
| **Goals**       |              |
| Emergency Fund  | $1000 / $200 |
| Investment      | $500 / $300  |

---

## 🏃‍♂️ Health & Fitness

| Metric     | Value                |
|------------|--------------------- |
| Workouts   | 3 sessions this week |
| Steps      | 8000 today           |
| Sleep      | 7 hours last night   |
| Stress     | 5                    |
|            |                      |
| **Goals**  |                      |
| Exercise   | 4 times per week     |
| Sleep      | 8 hours per night    |

---

## 📚 Learning & Growth

| Currently Learning   | Progress | Reading       |
|----------------------|----------|---------------|
| React                | 80%      | Atomic Habits |
|                      |          |               |
| **Skills to Develop**|          |               |
| TypeScript           | [ ]      |               |
| GraphQL              | [ ]      |               |

---

## 🔄 Weekly Habits

| Habit     | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|-----------|-----|-----|-----|-----|-----|-----|-----|
| Exercise  |  x  |     |  x  |     |  x  |     |     |
| Read      |  x  |  x  |     |     |  x  |     |  x  |
| Meditate  |     |     |     |  x  |     |     |     |

---

## 📝 This Week's Review

**Wins:**
- Finished MVP
- Exercised 3x

**Next Week's Priorities:**
- Launch to users
- Start new book
- Save $200

---

## 🎯 Monthly Goals

| Goal         | Status | Notes     |
|--------------|--------|-----------|
| Launch MVP   | [ ]    |           |
| Read 2 books | [ ]    |           |
| Save $500    | [ ]    |           |

---

## 📝 Quick Notes

**Today's Highlights:**
- Completed sprint
- Cooked healthy meal

**Gratitude:**
- Supportive team
- Good health

<!--
DASHBOARD FUNCTIONALITY HIGHLIGHTS:
- Use checkboxes ([ ] and [x]) for actionable goals and habit tracking.
- Use bold/italic for emphasis on key metrics.
- Use sections for clear separation of life areas.
- Add your own sections as needed!
-->
`,
};

export default LifeDashboardTemplate; 