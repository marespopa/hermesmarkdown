import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const CodeReviewTemplate: MarkdownTemplate = {
  filename: "code-review",
  frontMatter: {
    title: "Code Review",
    description: `A comprehensive template for conducting thorough code reviews with structured feedback and improvement suggestions.`,
    tags: "code,review,development,feedback",
  },
  content: `# 🔍 Code Review

**Date:** ${date}
**Reviewer:** [Your Name]
**Author:** [Code Author Name]
**PR/Commit:** [Link to PR or commit hash]

---

## 📋 Overview
**Files Changed:** [List of files being reviewed]
**Lines Changed:** [Number of lines added/removed]
**Type of Change:** [Bug Fix/Feature/Refactor/Documentation]

---

## ✅ Positive Feedback
- [ ] [What was done well]
- [ ] [Good practices observed]
- [ ] [Clear and readable code]
- [ ] [Proper documentation]

---

## ⚠️ Issues Found

### 🔴 Critical Issues
- [ ] [Critical issue 1]
- [ ] [Critical issue 2]

### 🟡 Major Issues
- [ ] [Major issue 1]
- [ ] [Major issue 2]

### 🟢 Minor Issues
- [ ] [Minor issue 1]
- [ ] [Minor issue 2]

---

## 💡 Suggestions for Improvement

### 🏗️ Architecture & Design
- [ ] [Architecture suggestion 1]
- [ ] [Design pattern suggestion]

### 🧪 Testing
- [ ] [Test coverage suggestion]
- [ ] [Test case recommendation]

### 📚 Documentation
- [ ] [Documentation improvement]
- [ ] [Comment clarification]

### ⚡ Performance
- [ ] [Performance optimization]
- [ ] [Efficiency improvement]

---

## 🔒 Security Considerations
- [ ] [Security concern 1]
- [ ] [Security concern 2]

---

## 🎯 Code Quality Checklist
- [ ] **Readability:** Code is easy to understand
- [ ] **Maintainability:** Code is well-structured
- [ ] **Testability:** Code is testable
- [ ] **Documentation:** Code is properly documented
- [ ] **Standards:** Code follows team standards
- [ ] **Error Handling:** Proper error handling
- [ ] **Logging:** Appropriate logging included

---

## 📝 Additional Comments
[Any other comments or observations]

---

## ✅ Review Decision
- [ ] **Approve:** Ready to merge
- [ ] **Request Changes:** Needs modifications
- [ ] **Comment:** General feedback only

**Next Steps:** [What should happen next]
`,
};

export default CodeReviewTemplate; 