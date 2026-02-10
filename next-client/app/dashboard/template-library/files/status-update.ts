import { MarkdownTemplate } from "..";

const StatusUpdateTemplate: MarkdownTemplate = {
  filename: "status-update",
  frontMatter: {
    title: "Status Update",
    description: "Provide a weekly engineering status update.",
    tags: "communication,status,team",
  },
  content: `# Status Update: {{time_period}}

**Role:** Team Lead
**Task:** Provide a status update for {{time_period}}.

## Success criteria
- Done when progress, blockers, and next steps are explicit.
- Judged by: completeness and brevity.

## Output contract
- Format: Markdown with sections Highlights, In Progress, Blockers, Next Steps.
- Length: <= 25 lines.
- Tone: concise and factual.

## Constraints
- Scope: only items worked this period.
- Assumptions: list explicitly.
- Exclusions: no future roadmap.
- If uncertain: flag items as tentative.

## Inputs
- Highlights: {{highlights}}
- In progress: {{in_progress}}
- Blockers: {{blockers}}

## Verification
- [ ] Each blocker has an owner
- [ ] Next steps are actionable
- [ ] Highlights include measurable outcomes
`,
};

export default StatusUpdateTemplate;
