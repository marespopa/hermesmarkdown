import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const UserStoryTemplate: MarkdownTemplate = {
  filename: "user-story",
  frontMatter: {
    title: "User Story",
    description: `A structured template for writing clear, actionable user stories with acceptance criteria and implementation details.`,
    tags: "agile,user-story,development,planning,requirements",
  },
  content: `# 👤 User Story

**Story ID:** [US-001]
**Created:** ${date}
**Author:** [Your Name]
**Priority:** [High/Medium/Low]
**Story Points:** [1/2/3/5/8/13]

---

## 📝 User Story
**As a** [type of user]
**I want** [goal/feature]
**So that** [benefit/value]

---

## 🎯 Acceptance Criteria
- [ ] **Given** [precondition]
  **When** [action]
  **Then** [expected result]

- [ ] **Given** [precondition]
  **When** [action]
  **Then** [expected result]

- [ ] **Given** [precondition]
  **When** [action]
  **Then** [expected result]

---

## 🔍 Definition of Done
- [ ] Code is written and reviewed
- [ ] Unit tests are written and passing
- [ ] Integration tests are written and passing
- [ ] UI/UX is implemented according to design
- [ ] Documentation is updated
- [ ] Feature is tested in staging environment
- [ ] Product owner has approved the implementation
- [ ] Feature is deployed to production

---

## 🏗️ Technical Requirements

### Frontend Requirements
- [ ] [Frontend requirement 1]
- [ ] [Frontend requirement 2]
- [ ] [Frontend requirement 3]

### Backend Requirements
- [ ] [Backend requirement 1]
- [ ] [Backend requirement 2]
- [ ] [Backend requirement 3]

### Database Requirements
- [ ] [Database requirement 1]
- [ ] [Database requirement 2]

### API Requirements
- [ ] [API requirement 1]
- [ ] [API requirement 2]

---

## 🎨 Design Requirements

### UI/UX Considerations
- **Design Reference:** [Link to design mockup]
- **Responsive Design:** [Mobile/tablet requirements]
- **Accessibility:** [WCAG compliance requirements]

### User Flow
1. [Step 1 in user flow]
2. [Step 2 in user flow]
3. [Step 3 in user flow]
4. [Continue as needed...]

---

## 🧪 Testing Requirements

### Unit Tests
- [ ] [Test case 1]
- [ ] [Test case 2]
- [ ] [Test case 3]

### Integration Tests
- [ ] [Integration test 1]
- [ ] [Integration test 2]

### User Acceptance Tests
- [ ] [UAT scenario 1]
- [ ] [UAT scenario 2]
- [ ] [UAT scenario 3]

---

## 📚 Documentation Requirements
- [ ] [Documentation item 1]
- [ ] [Documentation item 2]
- [ ] [Documentation item 3]

---

## 🔗 Dependencies
### Blocked By
- [ ] [Dependency 1]
- [ ] [Dependency 2]

### Blocks
- [ ] [Story that depends on this one]
- [ ] [Another dependent story]

---

## 💰 Business Value
**Value:** [High/Medium/Low]
**Reasoning:** [Why this story provides value]

---

## ⚠️ Risks & Assumptions
### Risks
- [ ] [Risk 1]
- [ ] [Risk 2]

### Assumptions
- [ ] [Assumption 1]
- [ ] [Assumption 2]

---

## 📋 Implementation Notes
[Any additional technical notes, considerations, or implementation details]

---

## ✅ Story Status
- [ ] **To Do:** Story is ready for development
- [ ] **In Progress:** Story is being worked on
- [ ] **In Review:** Story is being reviewed
- [ ] **Done:** Story is complete

**Assigned To:** [Developer Name]
**Estimated Completion:** [Date]
**Actual Completion:** [Date]

---

## 📝 Additional Comments
[Any other notes or comments about this user story]
`,
};

export default UserStoryTemplate; 