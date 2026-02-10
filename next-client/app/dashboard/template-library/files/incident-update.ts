import { MarkdownTemplate } from "..";

const IncidentUpdateTemplate: MarkdownTemplate = {
  filename: "incident-update",
  frontMatter: {
    title: "Incident Update",
    description: "Provide a short, structured incident update.",
    tags: "communication,incident,status",
  },
  content: `# Incident Update: {{incident_id}}

**Role:** On-Call Engineer
**Task:** Send a status update for {{incident_id}}.

## Success criteria
- Done when status, impact, and next update time are clear.
- Judged by: brevity and accuracy.

## Output contract
- Format: Markdown with sections Status, Impact, Current Actions, Next Update.
- Length: <= 15 lines.
- Tone: calm and operational.

## Constraints
- Scope: current facts only.
- Assumptions: list explicitly.
- Exclusions: no blame.
- If uncertain: state what is being investigated.

## Inputs
- Current status: {{current_status}}
- Impacted services: {{impacted_services}}
- Mitigations: {{mitigations}}
- Next update time: {{next_update_time}}

## Verification
- [ ] Impact is specific (users or services)
- [ ] Next update has a time
- [ ] Actions are in progress statements
`,
};

export default IncidentUpdateTemplate;
