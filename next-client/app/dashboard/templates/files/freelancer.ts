import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const FreelancerTemplate: MarkdownTemplate = {
  filename: "freelancer",
  frontMatter: {
    title: "Freelancer Dashboard",
    description: `A comprehensive dashboard for freelancers to manage clients, projects, finances, and business growth.`,
    tags: "freelancer,freelance,business,clients,projects,finance,entrepreneur",
  },
  content: `# 💼 Freelancer Dashboard

**Created:** ${date}

**Business Name:** [Your Business Name]

**Current Focus:** [Primary service or niche]

---

## 📊 Business Overview

### This Month's Stats
- **Income:** $[Amount]
- **Expenses:** $[Amount]
- **Profit:** $[Amount]
- **Hours Worked:** [X] hours
- **Active Clients:** [X] clients

### Year-to-Date
- **Total Income:** $[Amount]
- **Total Expenses:** $[Amount]
- **Net Profit:** $[Amount]

---

## 👥 Client Management

### Active Clients
#### [Client Name]
- **Contact:** [Email/Phone]
- **Project:** [Project description]
- **Rate:** $[X]/hour or $[X]/project
- **Status:** [Active/On Hold/Completed]
- **Next Deadline:** [Date]
- **Payment Status:** [Paid/Pending/Overdue]

### Prospective Clients
- [ ] **[Client Name]** - [Service needed] - [Contact date]
- [ ] **[Client Name]** - [Service needed] - [Contact date]

---

## 🎯 Current Projects

### [Project Name]
- **Client:** [Client Name]
- **Deadline:** [Date]
- **Budget:** $[Amount]
- **Progress:** [X]% complete
- **Status:** [In Progress/Review/Completed]

#### Tasks
- [ ] [Task 1] - Due: [Date]
- [ ] [Task 2] - Due: [Date]
- [ ] [Task 3] - Due: [Date]

---

## 💰 Financial Tracking

### Income Sources
- **Client Work:** $[Amount]
- **Passive Income:** $[Amount]
- **Other:** $[Amount]

### Monthly Expenses
- **Software/Tools:** $[Amount]
- **Marketing:** $[Amount]
- **Office/Equipment:** $[Amount]
- **Taxes:** $[Amount]

### Invoicing
#### Outstanding Invoices
- [ ] **Invoice #001** - [Client] - $[Amount] - Due: [Date]
- [ ] **Invoice #002** - [Client] - $[Amount] - Due: [Date]

---

## ⏰ Time Tracking

### This Week's Hours
| Day | Hours | Projects |
|-----|-------|----------|
| Monday | [X] | [Project names] |
| Tuesday | [X] | [Project names] |
| Wednesday | [X] | [Project names] |
| Thursday | [X] | [Project names] |
| Friday | [X] | [Project names] |

### Productivity Metrics
- **Billable Hours:** [X] hours
- **Non-billable Hours:** [X] hours
- **Utilization Rate:** [X]%

---

## 📈 Business Development

### Marketing Activities
- [ ] **Social Media:** [Platform] - [Content planned]
- [ ] **Blog Post:** [Topic] - Due: [Date]
- [ ] **Networking Event:** [Event name] - [Date]

### Lead Generation
#### New Leads This Month
- [ ] **[Lead Name]** - [Source] - [Service needed]
- [ ] **[Lead Name]** - [Source] - [Service needed]

### Professional Development
- [ ] **Course/Training:** [Course name] - [Date]
- [ ] **Skill Building:** [Skill to develop]

---

## 🎯 Goals & KPIs

### Monthly Goals
- [ ] **Income Goal:** $[Target] / $[Current]
- [ ] **Client Goal:** [X] new clients / [X] acquired
- [ ] **Project Goal:** [X] projects completed / [X] completed

### Quarterly Goals
- [ ] **Q1 Goal:** [Specific goal] - [Progress]
- [ ] **Q2 Goal:** [Specific goal] - [Progress]

### Annual Goals
- [ ] **Revenue Goal:** $[Target] / $[Current]
- [ ] **Client Base:** [X] clients / [X] current

---

## 🛠️ Tools & Resources

### Software Stack
- **Project Management:** [Tool name] - $[Cost]/month
- **Time Tracking:** [Tool name] - $[Cost]/month
- **Invoicing:** [Tool name] - $[Cost]/month

### Business Resources
- **Legal Documents:** [Status]
- **Insurance:** [Policy details]
- **Tax Documents:** [Organization status]

---

## 📝 Content & Portfolio

### Portfolio Projects
- [ ] **[Project Name]** - [Client] - [Date] - [Link]
- [ ] **[Project Name]** - [Client] - [Date] - [Link]

### Blog Content
- [ ] **[Blog Post Title]** - [Topic] - Due: [Date]
- [ ] **[Blog Post Title]** - [Topic] - Due: [Date]

---

## 🔄 Weekly Review

### This Week's Wins
- [Achievement 1]
- [Achievement 2]

### Challenges Faced
- [Challenge 1] - [How to address]
- [Challenge 2] - [How to address]

### Next Week's Priorities
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

---

## 📅 Important Dates

### Upcoming Deadlines
- [ ] **[Project]** - [Client] - Due: [Date]
- [ ] **[Project]** - [Client] - Due: [Date]

### Business Deadlines
- [ ] **Tax Payment** - Due: [Date]
- [ ] **Insurance Renewal** - Due: [Date]

---

## 🎨 Inspiration & Motivation

### Business Vision
[Your long-term vision for your freelance business]

### Success Metrics
- **Financial Freedom:** [Specific goal]
- **Work-Life Balance:** [Specific goal]
- **Creative Fulfillment:** [Specific goal]

---

## 📊 Performance Analytics

### Monthly Trends
- **Income Growth:** [X]% increase/decrease
- **Client Retention:** [X]% retention rate
- **Project Completion:** [X]% on-time delivery

### Year-over-Year Comparison
- **Income:** [X]% change from last year
- **Client Base:** [X]% change from last year
- **Hourly Rate:** [X]% change from last year
`,
};

export default FreelancerTemplate; 