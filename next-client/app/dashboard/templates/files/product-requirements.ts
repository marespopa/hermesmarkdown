import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const ProductRequirementsTemplate: MarkdownTemplate = {
  filename: "product-requirements",
  frontMatter: {
    title: "Product Requirements Document (PRD)",
    description: `A comprehensive template for documenting product requirements, features, and specifications for development teams.`,
    tags: "product,requirements,specification,development,planning",
  },
  content: `# 📋 Product Requirements Document (PRD)

**Document Version:** [1.0]
**Date Created:** ${date}
**Author:** [Your Name]
**Stakeholders:** [List of key stakeholders]

---

## 🎯 Executive Summary
**Product Name:** [Product Name]
**Product Vision:** [Brief description of what the product aims to achieve]

**Problem Statement:**
[Describe the problem this product solves]

**Solution Overview:**
[High-level description of the proposed solution]

---

## 👥 Target Users
### Primary Users
- **User Type 1:** [Description]
  - **Needs:** [What they need]
  - **Pain Points:** [Their current challenges]

### Secondary Users
- **User Type 2:** [Description]
  - **Needs:** [What they need]
  - **Pain Points:** [Their current challenges]

---

## 🎯 Goals & Objectives

### Primary Goals
- [ ] [Goal 1]
- [ ] [Goal 2]
- [ ] [Goal 3]

### Success Metrics
- **KPIs:** [Key Performance Indicators]
- **User Metrics:** [User engagement metrics]
- **Business Metrics:** [Revenue, cost, etc.]

---

## 🔧 Functional Requirements

### Core Features
#### Feature 1: [Feature Name]
- **Description:** [Detailed description]
- **User Story:** As a [user type], I want [goal] so that [benefit]
- **Acceptance Criteria:**
  - [ ] [Criterion 1]
  - [ ] [Criterion 2]
  - [ ] [Criterion 3]

#### Feature 2: [Feature Name]
- **Description:** [Detailed description]
- **User Story:** As a [user type], I want [goal] so that [benefit]
- **Acceptance Criteria:**
  - [ ] [Criterion 1]
  - [ ] [Criterion 2]
  - [ ] [Criterion 3]

### Secondary Features
- [ ] [Feature 3]
- [ ] [Feature 4]
- [ ] [Feature 5]

---

## 🎨 Non-Functional Requirements

### Performance
- **Response Time:** [Expected response times]
- **Throughput:** [Expected load capacity]
- **Scalability:** [Growth expectations]

### Security
- **Authentication:** [Authentication requirements]
- **Authorization:** [Access control requirements]
- **Data Protection:** [Privacy and security requirements]

### Usability
- **Accessibility:** [WCAG compliance level]
- **Mobile Responsiveness:** [Mobile requirements]
- **Browser Compatibility:** [Supported browsers]

---

## 🏗️ Technical Requirements

### Technology Stack
- **Frontend:** [Technology choices]
- **Backend:** [Technology choices]
- **Database:** [Database requirements]
- **Infrastructure:** [Hosting and deployment]

### Integration Requirements
- [ ] [Integration 1]
- [ ] [Integration 2]
- [ ] [Integration 3]

---

## 📊 Data Requirements

### Data Models
- **User Data:** [What user data is needed]
- **Content Data:** [What content data is needed]
- **Analytics Data:** [What analytics data is needed]

### Data Sources
- [ ] [Data source 1]
- [ ] [Data source 2]
- [ ] [Data source 3]

---

## 🎨 Design Requirements

### UI/UX Guidelines
- **Design System:** [Reference to design system]
- **Brand Guidelines:** [Brand compliance requirements]
- **User Experience:** [UX principles to follow]

### Wireframes & Mockups
- [ ] [Link to wireframes]
- [ ] [Link to mockups]
- [ ] [Link to prototypes]

---

## 📅 Timeline & Milestones

### Phase 1: [Phase Name]
- **Duration:** [Time period]
- **Deliverables:** [What will be delivered]
- **Dependencies:** [What needs to be completed first]

### Phase 2: [Phase Name]
- **Duration:** [Time period]
- **Deliverables:** [What will be delivered]
- **Dependencies:** [What needs to be completed first]

### Phase 3: [Phase Name]
- **Duration:** [Time period]
- **Deliverables:** [What will be delivered]
- **Dependencies:** [What needs to be completed first]

---

## 💰 Resource Requirements

### Team Requirements
- **Product Manager:** [Role requirements]
- **Designer:** [Role requirements]
- **Developers:** [Role requirements]
- **QA:** [Role requirements]

### Budget Considerations
- **Development Costs:** [Estimated costs]
- **Infrastructure Costs:** [Hosting and services]
- **Maintenance Costs:** [Ongoing costs]

---

## ⚠️ Risks & Mitigation

### Technical Risks
- **Risk 1:** [Description] - **Mitigation:** [How to address]
- **Risk 2:** [Description] - **Mitigation:** [How to address]

### Business Risks
- **Risk 1:** [Description] - **Mitigation:** [How to address]
- **Risk 2:** [Description] - **Mitigation:** [How to address]

---

## ✅ Approval & Sign-off
- [ ] **Product Manager:** [Name] - [Date]
- [ ] **Engineering Lead:** [Name] - [Date]
- [ ] **Design Lead:** [Name] - [Date]
- [ ] **Stakeholder:** [Name] - [Date]

---

## 📝 Appendices
- **User Research:** [Links to research]
- **Competitive Analysis:** [Links to analysis]
- **Technical Specifications:** [Links to tech specs]
`,
};

export default ProductRequirementsTemplate; 