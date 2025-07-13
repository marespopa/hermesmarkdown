import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

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
- **Primary Goal:** [Your main focus]
- **Success Metric:** [How you'll measure success]

---

## 💼 Work & Career
- [ ] **Project 1:** [Status] - Due: [Date]
- [ ] **Project 2:** [Status] - Due: [Date]
- [ ] **Skill Building:** [What you're learning]

**Work-Life Balance:** [Hours worked] / [Break time] / [Stress level 1-10]

---

## 💰 Finance & Budget
- **Income:** $[Amount]
- **Expenses:** $[Amount]
- **Savings:** $[Amount]

**Goals:**
- [ ] Emergency Fund: $[Target] / $[Current]
- [ ] Investment: $[Target] / $[Current]

---

## 🏃‍♂️ Health & Fitness
- **Workouts:** [X] sessions this week
- **Steps:** [X] today
- **Sleep:** [X] hours last night
- **Stress:** [1-10 scale]

**Goals:**
- [ ] Exercise [X] times per week
- [ ] Sleep [X] hours per night

---

## 📚 Learning & Growth
- **Currently Learning:** [Course/Topic]
- **Progress:** [X]% complete
- **Reading:** [Book title]

**Skills to Develop:**
- [ ] [Skill 1]
- [ ] [Skill 2]

---

## 🔄 Weekly Habits
| Habit | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|-------|-----|-----|-----|-----|-----|-----|-----|
| Exercise | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Read | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Meditate | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |

---

## 📝 This Week's Review
**Wins:**
- [Achievement 1]
- [Achievement 2]

**Next Week's Priorities:**
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

---

## 🎯 Monthly Goals
- [ ] [Goal 1]
- [ ] [Goal 2]
- [ ] [Goal 3]

---

## 📝 Quick Notes
**Today's Highlights:**
- [Highlight 1]
- [Highlight 2]

**Gratitude:**
- [Grateful for 1]
- [Grateful for 2]
`,
};

export default LifeDashboardTemplate; 