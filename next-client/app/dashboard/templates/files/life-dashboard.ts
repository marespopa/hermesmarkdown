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

## 🎯 This Week's Focus

**Primary Goal:**  
Finish project

**Success Metric:**  
100% complete

---

## 💼 Work & Career

**Projects:**  
- Project 1 – ☐ Launch MVP (Due: Mar 15)  
- Project 2 – ☐ QA review (Due: Mar 30)  
- Skill Building – ☐ React course  
- _Work-Life Balance:_ 40h / 5h / 6

---

## 💰 Finance & Budget

**Category:**  
- Income: $3,200  
- Expenses: $2,000  
- Savings: $1,000  

**Goals:**  
- Emergency Fund: $1,000 / $200  
- Investment: $500 / $300  

---

## 🏃‍♂️ Health & Fitness

**Metrics:**  
- Workouts: 3 sessions this week  
- Steps: 8,000 today  
- Sleep: 7 hours last night  
- Stress: 5/10  

**Goals:**  
- Exercise: 4 times per week  
- Sleep: 8 hours per night  

---

## 📚 Learning & Growth

**Currently Learning:**  
- React (Progress: 80%)  

**Reading:**  
- Atomic Habits

**Skills to Develop:**  
- ☐ TypeScript  
- ☐ GraphQL  

---

## 🔄 Weekly Habits

**Exercise:**  
- Mon: x  
- Tue:   
- Wed: x  
- Thu:   
- Fri: x  
- Sat:   
- Sun:   

**Read:**  
- Mon: x  
- Tue: x  
- Wed:   
- Thu:   
- Fri: x  
- Sat:   
- Sun: x  

**Meditate:**  
- Thu: x  

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

- ☐ Launch MVP  
- ☐ Read 2 books  
- ☐ Save $500  

---

## 📝 Quick Notes

**Today's Highlights:**  
- Completed sprint  
- Cooked healthy meal

**Gratitude:**  
- Supportive team  
- Good health
`,
};

export default LifeDashboardTemplate; 