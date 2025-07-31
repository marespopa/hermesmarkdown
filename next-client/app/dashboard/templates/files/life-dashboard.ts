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

**Success Metric:**

---

## 💼 Work & Career

**Projects:**  
- [ ]  
- [ ]  
- [ ]  

**Work-Life Balance:**  h /  h /  

---

## 💰 Finance & Budget

**Income:** $  
**Expenses:** $  
**Savings:** $  

**Goals:**  
- Emergency Fund: $ / $  
- Investment: $ / $  

---

## 🏃‍♂️ Health & Fitness

**Metrics:**  
- Workouts:  sessions this week  
- Steps:  today  
- Sleep:  hours last night  
- Stress: /10  

**Goals:**  
- Exercise:  times per week  
- Sleep:  hours per night  

---

## 📚 Learning & Growth

**Currently Learning:**  
-  (Progress: %)  

**Reading:**  
- 

**Skills to Develop:**  
- [ ]  
- [ ]  

---

## 🔄 Weekly Habits

**Exercise:**  
- Mon:   
- Tue:   
- Wed:   
- Thu:   
- Fri:   
- Sat:   
- Sun:   

**Read:**  
- Mon:   
- Tue:   
- Wed:   
- Thu:   
- Fri:   
- Sat:   
- Sun:   

**Meditate:**  
- Mon:   
- Tue:   
- Wed:   
- Thu:   
- Fri:   
- Sat:   
- Sun:   

---

## 📝 This Week's Review

**Wins:**  
- 
- 

**Next Week's Priorities:**  
- 
- 
- 

---

## 🎯 Monthly Goals

- [ ] 
- [ ] 
- [ ] 

---

## 📝 Quick Notes

**Today's Highlights:**  
- 
- 

**Gratitude:**  
- 
- 
`,
};

export default LifeDashboardTemplate; 