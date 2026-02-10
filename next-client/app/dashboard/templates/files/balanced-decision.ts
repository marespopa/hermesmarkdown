import { MarkdownTemplate } from "..";

const BalancedDecisionTemplate: MarkdownTemplate = {
  filename: "balanced-decision",
  frontMatter: {
    title: "Balanced Decision Audit",
    description: "Example decision prompt for infrastructure trade-offs.",
    tags: "management,planning,metrics",
  },
  content: `# Balanced Decision Audit - Move to Managed Postgres

**Role:** Engineering Manager
**Task:** Evaluate migrating from self-hosted Postgres to a managed provider.

## Success criteria
- Done when pros/cons are balanced and mitigations are actionable.
- Judged by: clarity of impact on reliability and cloud spend.

## Output contract
- Format: Markdown with a 3-row matrix and a final recommendation paragraph.
- Length: <= 30 lines.
- Tone: neutral, decision-ready.

## Constraints
- Scope: operational impact and cost only.
- Assumptions: state traffic and storage assumptions.
- Exclusions: no vendor comparison beyond the managed vs self-hosted decision.
- If uncertain: ask for missing cost figures.

## Inputs (must use)
- Current uptime: 99.7%
- Monthly DB cost: $7,500
- On-call hours: 40 hrs/month
- Target metric: cloud spend

## Example
If you mention cost, include a concrete monthly delta.

## Verification
- [ ] Matrix has 3 rows
- [ ] Each con has a mitigation
- [ ] Recommendation references the target metric

Provide the decision audit.
`,
};

export default BalancedDecisionTemplate;
