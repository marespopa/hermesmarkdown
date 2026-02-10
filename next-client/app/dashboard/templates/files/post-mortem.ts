import { MarkdownTemplate } from "..";

const PostMortemTemplate: MarkdownTemplate = {
  filename: "post-mortem",
  frontMatter: {
    title: "Post-Mortem",
    description: "Create a blameless post-mortem with timeline and actions.",
    tags: "communication,incident,operations",
  },
  content: `# Post-Mortem: {{incident_name}}

**Role:** Incident Lead
**Task:** Produce a blameless post-mortem for {{incident_name}}.

## Success criteria
- Done when timeline, root cause, and actions are explicit.
- Judged by: completeness and actionable follow-ups.

## Output contract
- Format: Markdown with sections Summary, Impact, Timeline, Root Cause, Actions, Lessons.
- Length: <= 60 lines.
- Tone: neutral and factual.

## Constraints
- Scope: only observed facts and confirmed causes.
- Assumptions: list explicitly.
- Exclusions: no speculation.
- If uncertain: mark as unknown and add a follow-up.

## Inputs
- Incident summary: {{incident_summary}}
- Timeline notes: {{timeline_notes}}
- Metrics impact: {{metrics_impact}}
- Mitigations: {{mitigations}}

## Verification
- [ ] Timeline is chronological with timestamps
- [ ] Root cause is a single concise statement
- [ ] Actions have owner and due date
`,
};

export default PostMortemTemplate;
