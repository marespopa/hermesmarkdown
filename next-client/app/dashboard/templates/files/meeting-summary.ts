import { MarkdownTemplate } from "..";

const MeetingSummaryTemplate: MarkdownTemplate = {
  filename: "meeting-summary",
  frontMatter: {
    title: "Meeting Summary",
    description: "Summarize decisions and actions from a meeting.",
    tags: "communication,meeting,summary",
  },
  content: `# Meeting Summary: {{meeting_name}}

**Role:** Facilitator
**Task:** Summarize {{meeting_name}}.

## Success criteria
- Done when decisions and action items are recorded.
- Judged by: accuracy and action clarity.

## Output contract
- Format: Markdown with sections Decisions, Action Items, Open Questions.
- Length: <= 20 lines.
- Tone: neutral.

## Constraints
- Scope: only decisions made in the meeting.
- Assumptions: list explicitly.
- Exclusions: no off-topic discussion.
- If uncertain: mark as TBD.

## Inputs
- Notes: {{meeting_notes}}
- Attendees: {{attendees}}

## Verification
- [ ] Each action item has owner and due date
- [ ] Decisions are stated as outcomes
- [ ] Open questions are phrased as questions
`,
};

export default MeetingSummaryTemplate;
