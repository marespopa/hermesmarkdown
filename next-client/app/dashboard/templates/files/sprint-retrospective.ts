import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const SprintRetrospectiveTemplate: MarkdownTemplate = {
  filename: "sprint-retrospective",
  frontMatter: {
    title: "Sprint Retrospective",
    description: `A structured template for agile teams to reflect on completed sprints, identify improvements, and plan for the next iteration.`,
    tags: "agile,sprint,retrospective,team,improvement",
  },
  content: `# 🚀 Sprint Retrospective

**Sprint:** [Sprint Number/Name]

**Date:** ${date}

**Duration:** [Sprint duration]

**Team:** [Team members present]

---

## 📊 Sprint Metrics
- **Velocity:** [Story points completed]
- **Sprint Goal:** [Was the sprint goal achieved?]
- **Burndown:** [How did the burndown chart look?]
- **Quality Metrics:** [Bugs, technical debt, etc.]

---

## 🎉 What Went Well
- [ ] [Positive aspect 1]
- [ ] [Positive aspect 2]
- [ ] [Positive aspect 3]
- [ ] [Positive aspect 4]

**Why did these things work well?**
[Explanation of why these aspects were successful]

---

## ⚠️ What Could Be Improved
- [ ] [Area for improvement 1]
- [ ] [Area for improvement 2]
- [ ] [Area for improvement 3]
- [ ] [Area for improvement 4]

**Why did these issues occur?**
[Root cause analysis]

---

## 💡 Action Items

### 🔥 High Priority
- [ ] [Action item 1] - Owner: [Name] - Due: [Date]
- [ ] [Action item 2] - Owner: [Name] - Due: [Date]

### 🟡 Medium Priority
- [ ] [Action item 3] - Owner: [Name] - Due: [Date]
- [ ] [Action item 4] - Owner: [Name] - Due: [Date]

### 🟢 Low Priority
- [ ] [Action item 5] - Owner: [Name] - Due: [Date]

---

## 🎯 Team Health Check

### 😊 Team Morale
- **Rating:** [1-5 scale]
- **Comments:** [How is the team feeling?]

### 🤝 Collaboration
- **Rating:** [1-5 scale]
- **Comments:** [How well is the team working together?]

### 📈 Learning & Growth
- **Rating:** [1-5 scale]
- **Comments:** [Is the team learning and growing?]

---

## 📋 Process Improvements

### 🏃‍♂️ Sprint Planning
- [ ] [Improvement suggestion 1]
- [ ] [Improvement suggestion 2]

### 📝 Daily Standups
- [ ] [Improvement suggestion 1]
- [ ] [Improvement suggestion 2]

### 🧪 Testing & Quality
- [ ] [Improvement suggestion 1]
- [ ] [Improvement suggestion 2]

### 📚 Documentation
- [ ] [Improvement suggestion 1]
- [ ] [Improvement suggestion 2]

---

## 🎪 Team Kudos
**Shoutouts to team members:**
- [Name]: [Reason for kudos]
- [Name]: [Reason for kudos]
- [Name]: [Reason for kudos]

---

## 📅 Next Sprint Preparation
- [ ] [Preparation item 1]
- [ ] [Preparation item 2]
- [ ] [Preparation item 3]

---

## 📝 Additional Notes
[Any other observations or comments]

---

## ✅ Retrospective Complete
- [ ] All team members participated
- [ ] Action items are assigned and dated
- [ ] Previous action items were reviewed
- [ ] Retrospective notes are shared with the team
`,
};

export default SprintRetrospectiveTemplate; 