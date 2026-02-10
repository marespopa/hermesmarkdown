import { MarkdownTemplate } from "..";

const RoadmapBriefTemplate: MarkdownTemplate = {
  filename: "roadmap-brief",
  frontMatter: {
    title: "Roadmap Brief",
    description: "Summarize roadmap changes and impacts for leadership.",
    tags: "communication,roadmap,planning",
  },
  content: `# Roadmap Brief: {{quarter}}

**Role:** Product Engineering Lead
**Task:** Summarize roadmap changes for {{quarter}}.

## Success criteria
- Done when changes, rationale, and impact are clear.
- Judged by: alignment and decision readiness.

## Output contract
- Format: Markdown with sections Changes, Rationale, Impact, Risks, Asks.
- Length: <= 25 lines.
- Tone: executive.

## Constraints
- Scope: confirmed roadmap items only.
- Assumptions: list explicitly.
- Exclusions: no detailed delivery plans.
- If uncertain: list open questions.

## Inputs
- Changes: {{changes}}
- Rationale: {{rationale}}
- Impact: {{impact}}

## Verification
- [ ] Each change has a rationale
- [ ] Risks include mitigation
- [ ] Asks are specific
`,
};

export default RoadmapBriefTemplate;
