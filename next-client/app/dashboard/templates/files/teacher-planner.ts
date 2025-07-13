import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const TeacherPlannerTemplate: MarkdownTemplate = {
  filename: "teacher-planner",
  frontMatter: {
    title: "Teacher Planner",
    description: `A comprehensive planner for teachers to organize lessons, track student progress, manage classroom activities, and plan curriculum.`,
    tags: "teacher,education,classroom,lesson,curriculum,student,teaching",
  },
  content: `# 👨‍🏫 Teacher Planner

**Created:** ${date}

**School Year:** [2024-2025]

**Teacher:** [Your Name]

**Grade/Subject:** [Grade Level and Subject]

**School:** [School Name]

---

## 📅 Weekly Overview

### Week of [Date Range]
**Theme:** [Weekly theme or focus]

**Objectives:**
- [ ] [Objective 1]
- [ ] [Objective 2]
- [ ] [Objective 3]

**Key Events:**
- [ ] [Event 1] - [Date/Time]
- [ ] [Event 2] - [Date/Time]

---

## 📚 Lesson Planning

### Monday - [Date]
**Subject:** [Subject]
**Topic:** [Lesson topic]
**Standard:** [State/Common Core standard]

**Objective:** [What students will learn]
**Materials Needed:**
- [ ] [Material 1]
- [ ] [Material 2]

**Activities:**
1. **Warm-up (10 min):** [Activity description]
2. **Direct Instruction (20 min):** [Activity description]
3. **Guided Practice (15 min):** [Activity description]
4. **Assessment (5 min):** [Assessment method]

**Homework:** [Assignment details]

### Tuesday - [Date]
**Subject:** [Subject]
**Topic:** [Lesson topic]
**Standard:** [State/Common Core standard]

**Objective:** [What students will learn]
**Materials Needed:**
- [ ] [Material 1]
- [ ] [Material 2]

**Activities:**
1. **Warm-up (10 min):** [Activity description]
2. **Direct Instruction (20 min):** [Activity description]
3. **Guided Practice (15 min):** [Activity description]
4. **Assessment (5 min):** [Assessment method]

**Homework:** [Assignment details]

### Wednesday - [Date]
**Subject:** [Subject]
**Topic:** [Lesson topic]
**Standard:** [State/Common Core standard]

**Objective:** [What students will learn]
**Materials Needed:**
- [ ] [Material 1]
- [ ] [Material 2]

**Activities:**
1. **Warm-up (10 min):** [Activity description]
2. **Direct Instruction (20 min):** [Activity description]
3. **Guided Practice (15 min):** [Activity description]
4. **Assessment (5 min):** [Assessment method]

**Homework:** [Assignment details]

### Thursday - [Date]
**Subject:** [Subject]
**Topic:** [Lesson topic]
**Standard:** [State/Common Core standard]

**Objective:** [What students will learn]
**Materials Needed:**
- [ ] [Material 1]
- [ ] [Material 2]

**Activities:**
1. **Warm-up (10 min):** [Activity description]
2. **Direct Instruction (20 min):** [Activity description]
3. **Guided Practice (15 min):** [Activity description]
4. **Assessment (5 min):** [Assessment method]

**Homework:** [Assignment details]

### Friday - [Date]
**Subject:** [Subject]
**Topic:** [Lesson topic]
**Standard:** [State/Common Core standard]

**Objective:** [What students will learn]
**Materials Needed:**
- [ ] [Material 1]
- [ ] [Material 2]

**Activities:**
1. **Warm-up (10 min):** [Activity description]
2. **Direct Instruction (20 min):** [Activity description]
3. **Guided Practice (15 min):** [Activity description]
4. **Assessment (5 min):** [Assessment method]

**Homework:** [Assignment details]

---

## 👥 Student Management

### Class Roster
#### Period 1 - [Subject] - [Time]
| Student Name | Contact Info | Notes |
|--------------|--------------|-------|
| [Student 1] | [Parent email/phone] | [Special needs/notes] |
| [Student 2] | [Parent email/phone] | [Special needs/notes] |

### Student Progress Tracking
#### [Student Name]
- **Current Grade:** [X]%
- **Missing Assignments:** [X] assignments
- **Behavior Notes:** [Recent observations]

### IEP/504 Accommodations
- **[Student Name]:** [Accommodation details]
- **[Student Name]:** [Accommodation details]

---

## 📊 Assessment & Grading

### Current Unit Assessment
**Unit:** [Unit name]
**Assessment Type:** [Test/Project/Presentation/etc.]
**Due Date:** [Date]
**Total Points:** [X] points

### Grade Book
#### Period 1 - [Subject]
| Student | Assignment 1 | Assignment 2 | Average |
|---------|--------------|--------------|---------|
| [Student 1] | [X]/[Total] | [X]/[Total] | [X]% |
| [Student 2] | [X]/[Total] | [X]/[Total] | [X]% |

### Missing Work Tracking
- **[Student Name]:** [Assignment] - Due: [Date] - [Status]
- **[Student Name]:** [Assignment] - Due: [Date] - [Status]

---

## 🎯 Curriculum Planning

### Year-Long Curriculum Map
#### Quarter 1
- **Unit 1:** [Unit name] - [Dates] - [Standards covered]
- **Unit 2:** [Unit name] - [Dates] - [Standards covered]

#### Quarter 2
- **Unit 3:** [Unit name] - [Dates] - [Standards covered]
- **Unit 4:** [Unit name] - [Dates] - [Standards covered]

### Standards Alignment
#### [Standard Code]
- **Unit:** [Unit name]
- **Lessons:** [Lesson numbers]
- **Assessment:** [Assessment type]
- **Mastery Level:** [X]% of students proficient

---

## 🏫 Classroom Management

### Daily Routines
- **Morning Routine:** [Steps and timing]
- **Transition Procedures:** [How students move between activities]
- **End-of-Day Routine:** [Cleanup and dismissal procedures]

### Behavior Management
#### Positive Reinforcement
- [ ] [Strategy 1] - [How often used]
- [ ] [Strategy 2] - [How often used]

#### Consequences
- [ ] [Consequence 1] - [When used]
- [ ] [Consequence 2] - [When used]

### Seating Charts
#### Period 1
\`\`\`
[Front of Room]
[Desk] [Desk] [Desk] [Desk]
[Desk] [Desk] [Desk] [Desk]
[Teacher's Desk]
\`\`\`

### Classroom Jobs
- **[Job Title]:** [Student Name] - [Responsibilities]
- **[Job Title]:** [Student Name] - [Responsibilities]

---

## 📞 Parent Communication

### Parent Contact Log
#### [Parent Name] - [Date]
- **Reason for Contact:** [Academic/Behavior/Other]
- **Method:** [Phone/Email/In-person]
- **Summary:** [What was discussed]
- **Follow-up Needed:** [Yes/No] - [Date]

### Parent-Teacher Conference Schedule
- [ ] **[Student Name]** - [Date/Time] - [Parent name]
- [ ] **[Student Name]** - [Date/Time] - [Parent name]

### Newsletter/Updates
- [ ] **Monthly Newsletter** - Due: [Date]
- [ ] **Weekly Update** - Due: [Date]

---

## 🎨 Professional Development

### Goals for This Year
- [ ] **Goal 1:** [Specific goal] - [Progress]
- [ ] **Goal 2:** [Specific goal] - [Progress]

### Training & Workshops
- [ ] **[Training Name]** - [Date] - [Location]
- [ ] **[Training Name]** - [Date] - [Location]

### Observations & Feedback
#### [Observer Name] - [Date]
- **Strengths:** [Positive feedback]
- **Areas for Growth:** [Suggestions for improvement]
- **Action Plan:** [Steps to implement feedback]

---

## 📋 Administrative Tasks

### Weekly To-Do List
- [ ] [Task 1] - Due: [Date]
- [ ] [Task 2] - Due: [Date]
- [ ] [Task 3] - Due: [Date]

### Monthly Tasks
- [ ] **Grade Reports** - Due: [Date]
- [ ] **Lesson Plans** - Due: [Date]
- [ ] **Professional Development Hours** - Due: [Date]

### Important Deadlines
- [ ] **[Event/Task]** - Due: [Date]
- [ ] **[Event/Task]** - Due: [Date]

---

## 🎯 Reflection & Growth

### Weekly Reflection
**Week of:** [Date range]

#### What Went Well
- [Success 1]
- [Success 2]

#### Challenges Faced
- [Challenge 1] - [How to address]
- [Challenge 2] - [How to address]

#### Next Week's Focus
- [Focus area 1]
- [Focus area 2]

### Monthly Goals Review
- [ ] **Goal 1:** [Progress update]
- [ ] **Goal 2:** [Progress update]

---

## 📚 Resources & Materials

### Classroom Library
- [ ] **[Book Title]** - [Genre] - [Reading level]
- [ ] **[Book Title]** - [Genre] - [Reading level]

### Digital Resources
- [ ] **[Resource Name]** - [URL] - [Purpose]
- [ ] **[Resource Name]** - [URL] - [Purpose]

### Supplies Inventory
- [ ] **[Supply]** - [Quantity] - [Reorder when below X]
- [ ] **[Supply]** - [Quantity] - [Reorder when below X]

---

## 🎉 Special Events & Celebrations

### School Events
- [ ] **[Event Name]** - [Date] - [Your role]
- [ ] **[Event Name]** - [Date] - [Your role]

### Student Birthdays
- [ ] **[Student Name]** - [Date] - [Age]
- [ ] **[Student Name]** - [Date] - [Age]

### Cultural Celebrations
- [ ] **[Holiday/Event]** - [Date] - [Activities planned]
- [ ] **[Holiday/Event]** - [Date] - [Activities planned]

---

## 📊 Data & Analytics

### Student Performance Trends
- **Class Average:** [X]%
- **Growth Rate:** [X]% improvement
- **Standard Mastery:** [X]% of students proficient
- **Attendance Rate:** [X]%

### Assessment Results
- **Test 1 Average:** [X]%
- **Test 2 Average:** [X]%
- **Project Average:** [X]%
- **Overall Class Average:** [X]%

### Behavior Data
- **Positive Incidents:** [X] this week
- **Behavior Issues:** [X] this week
- **Referrals:** [X] this month
- **Parent Contacts:** [X] this month
`,
};

export default TeacherPlannerTemplate; 