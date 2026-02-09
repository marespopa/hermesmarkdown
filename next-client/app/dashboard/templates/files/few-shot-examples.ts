import { MarkdownTemplate } from "..";

const FewShotTemplate: MarkdownTemplate = {
  filename: "few-shot-examples",
  frontMatter: {
    title: "Few-Shot Example Library",
    description: `Build example-based prompts with structured input-output pairs to guide AI behavior.`,
    tags: "examples,logic,prompt-engineering",
  },
  content: `---
title: Few-Shot Example Library
tags: [examples, logic]
---

# 📚 Few-Shot Prompting

Provide clear examples to guide AI behavior and output quality.

---

## Example 1

**Input:** {{input_1}}

**Output:** {{output_1}}

---

## Example 2

**Input:** {{input_2}}

**Output:** {{output_2}}

---

## Example 3

**Input:** {{input_3}}

**Output:** {{output_3}}

---

## Pattern Recognition

**What the AI should learn from these examples:**
- Pattern 1: [Describe the pattern]
- Pattern 2: [Describe the pattern]
- Pattern 3: [Describe the pattern]

---

## Best Practices for Few-Shot Prompting

1. **Consistency:** Keep input-output format consistent across examples
2. **Diversity:** Include examples that cover edge cases and variations
3. **Clarity:** Make the relationship between input and output obvious
4. **Complexity Gradient:** Start simple, gradually increase complexity

---

## Additional Notes

[Add any special instructions or context]



`,
};

export default FewShotTemplate;
