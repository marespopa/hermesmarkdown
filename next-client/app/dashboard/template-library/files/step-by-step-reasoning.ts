import { MarkdownTemplate } from "..";

const StepByStepReasoningTemplate: MarkdownTemplate = {
  filename: "step-by-step-reasoning",
  frontMatter: {
    title: "Step-by-Step Reasoning",
    description: "Example debugging prompt that requires short rationale and checks.",
    tags: "logic,debugging,complex",
  },
  content: `# Step-by-Step Reasoning - Slow API Debugging

**Role:** Backend Engineer
**Task:** Diagnose a slow API endpoint and propose fixes.

## Success criteria
- Done when the root cause hypotheses are ranked and fixes are testable.
- Judged by: clarity of reasoning and feasibility of next steps.

## Output contract
- Format: Markdown with sections: Assumptions, Reasoning (numbered), Fixes, Self-Critique.
- Length: <= 35 lines.
- Tone: technical and concise.

## Constraints
- Scope: only use the provided telemetry.
- Assumptions: list explicitly.
- Exclusions: do not suggest new infrastructure.
- If uncertain: ask 1-2 clarifying questions.

## Inputs (must use)
- Endpoint: GET /v2/orders
- p95 latency: 2.4s (target 300ms)
- DB queries per request: 18
- Cache hit rate: 12%

## Examples
- A good reasoning step: "High query count suggests N+1 on line items."

## Verification
- [ ] Reasoning steps are numbered
- [ ] Fixes map to a specific observation
- [ ] Self-critique includes a risk or blind spot

Start the analysis.
`,
};

export default StepByStepReasoningTemplate;
