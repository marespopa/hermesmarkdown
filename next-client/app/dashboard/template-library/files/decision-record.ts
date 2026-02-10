import { MarkdownTemplate } from "..";

const DecisionRecordTemplate: MarkdownTemplate = {
  filename: "decision-record",
  frontMatter: {
    title: "Decision Record",
    description: "Create a concise ADR-style decision record.",
    tags: "communication,decision,adr",
  },
  content: `# Decision Record: {{decision_title}}

**Role:** Technical Lead
**Task:** Document the decision for {{decision_title}}.

## Success criteria
- Done when context, decision, and consequences are explicit.
- Judged by: clarity and traceability.

## Output contract
- Format: Markdown with sections Context, Decision, Alternatives, Consequences.
- Length: <= 30 lines.
- Tone: direct.

## Constraints
- Scope: current decision only.
- Assumptions: list explicitly.
- Exclusions: no implementation details.
- If uncertain: list what is unknown.

## Inputs
- Context: {{context}}
- Decision: {{decision}}
- Alternatives: {{alternatives}}

## Verification
- [ ] Alternatives include at least 2 options
- [ ] Consequences include trade-offs
- [ ] Decision is a single sentence
`,
};

export default DecisionRecordTemplate;
