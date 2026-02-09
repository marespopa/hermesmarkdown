import { MarkdownTemplate } from "..";

const PromptStarterTemplate: MarkdownTemplate = {
  filename: "prompt-starter",
  frontMatter: {
    title: "Prompt Starter",
    description: "A minimal prompt template to quickly define task, context, and output.",
    tags: "prompt,starter,template",
  },
  content: `# Prompt Starter

## Task
[What do you want the model to do?]

## Context
[Background, constraints, or relevant details]

## Inputs
- [Input 1]
- [Input 2]

## Output Requirements
- Format: [e.g., bullet list, JSON, markdown]
- Tone: [e.g., formal, concise]
- Must include: [key items]
- Must avoid: [things to avoid]

## Example
**Input:** [short example input]

**Output:** [short example output]
`,
};

export default PromptStarterTemplate;
