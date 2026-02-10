import { MarkdownTemplate } from "..";

const LegacyModernizationTemplate: MarkdownTemplate = {
  filename: "legacy-modernization",
  frontMatter: {
    title: "Legacy to Modernization Path",
    description: "Example modernization prompt with zero-downtime constraints.",
    tags: "onboarding,debt-reduction",
  },
  content: `# Legacy to Modernization Path - Monolith to Services

**Role:** Platform Lead
**Task:** Plan modernization of a legacy billing monolith.

## Success criteria
- Done when the migration path is staged with zero downtime and clear ownership.
- Judged by: realistic milestones and risk mitigation.

## Output contract
- Format: Markdown with sections: Functional Summary, Debt Audit, Modernization Path, Docs.
- Length: <= 50 lines.
- Tone: practical and implementation-ready.

## Constraints
- Scope: billing domain only.
- Assumptions: note data volume and peak traffic windows.
- Exclusions: no schema redesign unless required.
- If uncertain: ask for missing traffic or compliance requirements.

## Inputs (must use)
- Current stack: Rails 5 + Sidekiq + Postgres
- Target stack: Kotlin services + Kafka + Postgres
- Uptime requirement: 99.9%
- Deployment window: 02:00-04:00 UTC

## Examples
- Debt item example: "Shared billing and invoicing tables cause cross-team lock contention."

## Verification
- [ ] Modernization path has at least 3 stages
- [ ] Zero-downtime strategy is explicit
- [ ] Docs include a JSDoc-style stub example

Provide the modernization plan.
`,
};

export default LegacyModernizationTemplate;
