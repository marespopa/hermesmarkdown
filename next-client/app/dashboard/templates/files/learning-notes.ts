import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const LearningNotesTemplate: MarkdownTemplate = {
  filename: "learning-notes",
  frontMatter: {
    title: "Learning Notes",
    description: `A comprehensive template for taking structured notes during courses, tutorials, and learning sessions.`,
    tags: "learning,education,notes,study,course",
  },
  content: `# 📚 Learning Notes

**Course/Topic:** [Course Name or Topic]
**Session Date:** ${date}
**Instructor:** [Instructor Name]
**Duration:** [Session duration]
**Your Name:** [Your Name]

---

## 🎯 Learning Objectives
**Main Goal:** [What you want to learn today]
- [ ] [Objective 1]
- [ ] [Objective 2]
- [ ] [Objective 3]

---

## 📝 Key Concepts

### Concept 1: [Concept Name]
**Definition:** [Clear definition of the concept]
**Why Important:** [Why this concept matters]
**Examples:** [Real-world examples]
**Notes:** [Your personal notes and thoughts]

### Concept 2: [Concept Name]
**Definition:** [Clear definition of the concept]
**Why Important:** [Why this concept matters]
**Examples:** [Real-world examples]
**Notes:** [Your personal notes and thoughts]

### Concept 3: [Concept Name]
**Definition:** [Clear definition of the concept]
**Why Important:** [Why this concept matters]
**Examples:** [Real-world examples]
**Notes:** [Your personal notes and thoughts]

---

## 💻 Code Examples

### Example 1: [Description]
\`\`\`[language]
// Code example
function example() {
    return "Hello World";
}
\`\`\`
**Explanation:** [What this code does]
**Key Points:** [Important things to remember]

### Example 2: [Description]
\`\`\`[language]
// Another code example
const result = processData(input);
\`\`\`
**Explanation:** [What this code does]
**Key Points:** [Important things to remember]

---

## 🔗 Important Links & Resources
- [Resource 1](URL) - [Description]
- [Resource 2](URL) - [Description]
- [Resource 3](URL) - [Description]

---

## ❓ Questions & Clarifications
**Q1:** [Your question]
**A:** [Answer or need to research]

**Q2:** [Your question]
**A:** [Answer or need to research]

**Q3:** [Your question]
**A:** [Answer or need to research]

---

## 🎯 Practice Exercises
### Exercise 1: [Exercise Name]
**Problem:** [Description of the problem]
**Your Solution:** [Your attempt]
**Correct Solution:** [If provided]
**What You Learned:** [Key takeaways]

### Exercise 2: [Exercise Name]
**Problem:** [Description of the problem]
**Your Solution:** [Your attempt]
**Correct Solution:** [If provided]
**What You Learned:** [Key takeaways]

---

## 📊 Progress Tracking
**Session Progress:** [How much of the material was covered]
**Your Understanding:** [Rate your understanding 1-10]
**Areas of Confusion:** [What's still unclear]

---

## 🧠 Memory Techniques
### Mnemonics
- [Mnemonic 1] - [What it helps remember]
- [Mnemonic 2] - [What it helps remember]

### Visual Aids
- [Visual aid 1] - [Description]
- [Visual aid 2] - [Description]

---

## 🔄 Review Questions
**For Next Session:**
1. [Question to review]
2. [Question to review]
3. [Question to review]

**For Final Review:**
1. [Question to review]
2. [Question to review]
3. [Question to review]

---

## 📚 Related Topics
**Prerequisites:** [Topics you should know before this]
**Next Steps:** [Topics that build on this]
**Related Courses:** [Other courses that cover similar material]

---

## 💡 Personal Insights
**Aha Moments:** [Sudden realizations or connections]
**Challenges:** [What was difficult to understand]
**Strategies:** [How you overcame challenges]

---

## 🎯 Action Items
- [ ] [Action item 1] - Due: [Date]
- [ ] [Action item 2] - Due: [Date]
- [ ] [Action item 3] - Due: [Date]

---

## 📝 Summary
**Key Takeaways:** [3-5 main points from this session]
**Next Session Goals:** [What you want to focus on next time]
**Overall Progress:** [How you feel about your learning journey]

---

## 🔄 Follow-up
**Review Date:** [When to review these notes]
**Practice Schedule:** [When to practice the concepts]
**Assessment:** [How to test your understanding]

---

## 📖 Additional Notes
[Any other thoughts, observations, or notes from the session]

---

## 🏷️ Tags
#learning #education #[topic] #[course-name] #[date]
`,
};

export default LearningNotesTemplate; 