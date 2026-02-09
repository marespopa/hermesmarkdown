import { MarkdownTemplate } from "..";

const ChainOfThoughtTemplate: MarkdownTemplate = {
  filename: "chain-of-thought",
  frontMatter: {
    title: "Reasoning Template",
    description: `Structure complex reasoning with step-by-step logic for better AI outputs.`,
    tags: "logic,reasoning,prompt-engineering",
  },
  content: `# 🧠 Chain-of-Thought Framework

Breaking down complex problems into structured reasoning steps leads to more accurate and thoughtful AI responses.

---

## Problem Statement

**Task:** [Clearly define what needs to be solved]

**Constraints:** [Any limitations or requirements]

**Goal:** [What success looks like]

---

## Step 1: Identify Problem

### Questions to Ask:
- What is the core issue?
- What information do we have?
- What information is missing?

### Analysis:
[Your analysis here]

---

## Step 2: Evaluate Solutions

### Option A:
- **Pros:**
  - [ ] Pro 1
  - [ ] Pro 2
- **Cons:**
  - [ ] Con 1
  - [ ] Con 2

### Option B:
- **Pros:**
  - [ ] Pro 1
  - [ ] Pro 2
- **Cons:**
  - [ ] Con 1
  - [ ] Con 2

### Option C:
- **Pros:**
  - [ ] Pro 1
  - [ ] Pro 2
- **Cons:**
  - [ ] Con 1
  - [ ] Con 2

---

## Step 3: Final Output

### Recommended Solution:
[Explain which option and why]

### Implementation Plan:
1. Action 1
2. Action 2
3. Action 3

### Expected Outcome:
[What will result from this approach]

### Validation Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

---

## Assumptions Made

[Document any assumptions that underlie this reasoning]

---

## Alternative Approaches

[If the above approach doesn't work, what's Plan B?]


`,
};

export default ChainOfThoughtTemplate;
