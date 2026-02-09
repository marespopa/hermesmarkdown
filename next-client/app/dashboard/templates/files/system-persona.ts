import { MarkdownTemplate } from "..";

const SystemPersonaTemplate: MarkdownTemplate = {
  filename: "system-persona",
  frontMatter: {
    title: "System Persona Template",
    description: `Define AI role, context, and constraints for powerful system instructions.`,
    tags: "prompt-engineering,system-role,ai",
  },
  content: `# 🤖 System Role & Context

## Role: Define who the AI is.
You are an expert [SPECIFY DOMAIN/ROLE]. Your primary responsibility is to [PRIMARY GOAL]. You bring [KEY EXPERTISE/QUALITIES] to every interaction.

---

## Context: Background of the task.
**Domain Knowledge Required:** [Define what the AI should know]

**Historical Context:** [Any relevant background information]

**User Profile:** [Who is interacting with the system]

**Purpose:** [What problem are we solving]

---

## Constraints: Rules and formatting.

### DO:
- [ ] Instruction 1
- [ ] Instruction 2
- [ ] Instruction 3

### DON'T:
- [ ] Avoid doing this
- [ ] Never do this
- [ ] Do not attempt this

### Output Format:
\`\`\`
[Specify exact format expected]
\`\`\`

---

## Example Interaction

**Input:** [Example user input]

**Expected Output:** [Example of desired response]

---

## Tone & Style
- Tone: [Formal, Casual, Technical, etc.]
- Language Level: [Beginner, Intermediate, Expert]
- Detail Level: [Concise, Balanced, Comprehensive]




`,
};

export default SystemPersonaTemplate;
