import { MarkdownTemplate } from "..";

const StakeholderBriefTemplate: MarkdownTemplate = {
  filename: "stakeholder-brief",
  frontMatter: {
    title: "Stakeholder Brief",
    description: "Summarize a decision or change for non-technical stakeholders.",
    tags: "communication,stakeholders,summary",
  },
  content: `# Stakeholder Brief: {{topic}}

**Role:** Engineering Lead
**Task:** Summarize {{topic}} for stakeholders.

## Success criteria
- Done when decision, impact, and timeline are clear.
- Judged by: clarity and alignment to business goals.

## Output contract
- Format: Markdown with sections Decision, Impact, Timeline, Risks, Next Steps.
- Length: <= 20 lines.
- Tone: executive, plain language.

## Constraints
- Scope: confirmed decisions only.
- Assumptions: list explicitly.
- Exclusions: no technical deep dives.
- If uncertain: include open questions.

## Inputs
- Decision summary: {{decision_summary}}
- Business impact: {{business_impact}}
- Timeline: {{timeline}}

## Verification
- [ ] Impact is measurable
- [ ] Timeline has milestones
- [ ] Risks include mitigation
`,
};

export default StakeholderBriefTemplate;
