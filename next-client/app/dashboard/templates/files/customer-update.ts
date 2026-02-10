import { MarkdownTemplate } from "..";

const CustomerUpdateTemplate: MarkdownTemplate = {
  filename: "customer-update",
  frontMatter: {
    title: "Customer Update",
    description: "Communicate progress and timelines to customers.",
    tags: "communication,customer,update",
  },
  content: `# Customer Update: {{topic}}

**Role:** Customer Engineering
**Task:** Provide a customer update on {{topic}}.

## Success criteria
- Done when status, timeline, and next actions are clear.
- Judged by: clarity and customer impact focus.

## Output contract
- Format: Markdown with sections Status, Impact, Timeline, Next Steps.
- Length: <= 20 lines.
- Tone: professional and reassuring.

## Constraints
- Scope: confirmed facts only.
- Assumptions: list explicitly.
- Exclusions: no internal details or blame.
- If uncertain: state what is being validated.

## Inputs
- Status: {{status}}
- Customer impact: {{customer_impact}}
- Timeline: {{timeline}}

## Verification
- [ ] Impact is customer-facing
- [ ] Timeline includes dates
- [ ] Next steps include an owner
`,
};

export default CustomerUpdateTemplate;
