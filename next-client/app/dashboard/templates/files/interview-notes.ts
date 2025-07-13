import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const InterviewNotesTemplate: MarkdownTemplate = {
  filename: "interview-notes",
  frontMatter: {
    title: "Interview Notes",
    description: `A structured template for documenting job interviews, candidate evaluations, and hiring decisions.`,
    tags: "interview,hiring,recruitment,candidate,evaluation",
  },
  content: `# 👔 Interview Notes

**Candidate Name:** [Full Name]  

**Position:** [Job Title]  

**Interview Date:** ${date}  

**Interview Type:** [Phone/Screen/On-site/Final]  

**Interviewer(s):** [Interviewer Names]  

**Duration:** [Interview duration]  

---

## 📋 Candidate Information
- **Email:** [candidate@email.com]
- **Phone:** [Phone number]
- **Current Role:** [Current job title]
- **Company:** [Current company]
- **Years of Experience:** [X years]
- **Location:** [City, State/Country]
- **Visa Status:** [If applicable]

---

## 🎯 Role Requirements vs. Candidate Fit

### Required Skills
| Skill | Required Level | Candidate Level | Notes |
|-------|----------------|-----------------|-------|
| [Skill 1] | [Expert/Intermediate/Beginner] | [Expert/Intermediate/Beginner] | [Comments] |
| [Skill 2] | [Expert/Intermediate/Beginner] | [Expert/Intermediate/Beginner] | [Comments] |
| [Skill 3] | [Expert/Intermediate/Beginner] | [Expert/Intermediate/Beginner] | [Comments] |

### Technical Assessment
- **Coding Challenge:** [Score/Feedback]
- **System Design:** [Score/Feedback]
- **Problem Solving:** [Score/Feedback]
- **Code Quality:** [Score/Feedback]

---

## 💬 Interview Questions & Responses

### Technical Questions
**Q1:** [Technical question]
**Response:** [Candidate's answer]
**Rating:** [1-5 scale]
**Notes:** [Additional comments]

**Q2:** [Technical question]
**Response:** [Candidate's answer]
**Rating:** [1-5 scale]
**Notes:** [Additional comments]

### Behavioral Questions
**Q1:** [Behavioral question]
**Response:** [Candidate's answer using STAR method]
**Rating:** [1-5 scale]
**Notes:** [Additional comments]

**Q2:** [Behavioral question]
**Response:** [Candidate's answer using STAR method]
**Rating:** [1-5 scale]
**Notes:** [Additional comments]

### Culture Fit Questions
**Q1:** [Culture fit question]
**Response:** [Candidate's answer]
**Rating:** [1-5 scale]
**Notes:** [Additional comments]

---

## 🎯 Key Strengths
- [ ] [Strength 1]
- [ ] [Strength 2]
- [ ] [Strength 3]
- [ ] [Strength 4]

---

## ⚠️ Areas of Concern
- [ ] [Concern 1]
- [ ] [Concern 2]
- [ ] [Concern 3]

---

## 💡 Questions Asked by Candidate
1. **Q:** [Candidate's question]
   **A:** [Your answer]

2. **Q:** [Candidate's question]
   **A:** [Your answer]

3. **Q:** [Candidate's question]
   **A:** [Your answer]

---

## 📊 Overall Assessment

### Technical Skills
- **Rating:** [1-5 scale]
- **Comments:** [Detailed feedback]

### Communication Skills
- **Rating:** [1-5 scale]
- **Comments:** [Detailed feedback]

### Problem Solving
- **Rating:** [1-5 scale]
- **Comments:** [Detailed feedback]

### Culture Fit
- **Rating:** [1-5 scale]
- **Comments:** [Detailed feedback]

### Growth Potential
- **Rating:** [1-5 scale]
- **Comments:** [Detailed feedback]

---

## 🎯 Recommendation
- [ ] **Strong Hire:** Candidate exceeds expectations
- [ ] **Hire:** Candidate meets requirements
- [ ] **Weak Hire:** Candidate barely meets requirements
- [ ] **No Hire:** Candidate does not meet requirements

### Reasoning
[Detailed explanation of the recommendation]

---

## 💰 Compensation Discussion
- **Current Salary:** [If discussed]
- **Expected Salary:** [If discussed]
- **Budget Range:** [If applicable]
- **Notes:** [Any compensation-related notes]

---

## 📅 Next Steps
- [ ] **Schedule Next Round:** [Date/Time]
- [ ] **Send Rejection:** [Date]
- [ ] **Make Offer:** [Date]
- [ ] **Follow Up:** [Date]

### Action Items
- [ ] [Action item 1] - Owner: [Name] - Due: [Date]
- [ ] [Action item 2] - Owner: [Name] - Due: [Date]
- [ ] [Action item 3] - Owner: [Name] - Due: [Date]

---

## 📝 Additional Notes
[Any other observations, impressions, or notes about the candidate]

---

## 🔒 Confidentiality
This document contains confidential information and should be handled according to company policies.

**Interviewer Signature:** [Digital signature or initials]

**Date:** ${date}
`,
};

export default InterviewNotesTemplate; 