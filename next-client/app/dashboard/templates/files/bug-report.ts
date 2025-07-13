import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const BugReportTemplate: MarkdownTemplate = {
  filename: "bug-report",
  frontMatter: {
    title: "Bug Report",
    description: `A structured template for documenting software bugs with all necessary details for developers to reproduce and fix issues.`,
    tags: "bug,development,issue,software",
  },
  content: `# 🐛 Bug Report

**Date Reported:** ${date}

**Reporter:** [Your Name]

**Priority:** [Critical/High/Medium/Low]

---

## 📋 Bug Summary
**Title:** [Brief description of the bug]

**Description:** 
[Detailed description of what the bug is and how it affects the user]

---

## 🔍 Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Continue as needed...]

**Expected Result:** [What should happen]
**Actual Result:** [What actually happens]

---

## 🖥️ Environment
- **OS:** [Windows/Mac/Linux]
- **Browser:** [Chrome/Firefox/Safari/Edge] (if applicable)
- **Version:** [Version number]
- **Device:** [Desktop/Mobile/Tablet]

---

## 📸 Screenshots/Videos
[Attach screenshots or screen recordings if applicable]

---

## 🔧 Additional Information
- **Error Messages:** [Any error messages displayed]
- **Console Logs:** [Relevant console output]
- **Related Issues:** [Links to similar bugs or related issues]

---

## 🏷️ Labels
- **Type:** [Bug/Feature Request/Enhancement]
- **Component:** [Frontend/Backend/Database/UI/API]
- **Severity:** [Critical/High/Medium/Low]

---

## ✅ Acceptance Criteria
- [ ] Bug is reproducible
- [ ] Root cause is identified
- [ ] Fix is implemented
- [ ] Tests are written
- [ ] Documentation is updated
`,
};

export default BugReportTemplate; 