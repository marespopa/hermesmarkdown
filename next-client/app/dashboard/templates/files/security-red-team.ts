import { MarkdownTemplate } from "..";

const SecurityRedTeamTemplate: MarkdownTemplate = {
  filename: "security-red-team",
  frontMatter: {
    title: "Security Red Team",
    description: "Identify exploit paths and mitigation steps under strict constraints.",
    tags: "security,red-team,threat-model",
  },
  content: `# Security Red Team: {{system_name}}

**Role:** Red Team Engineer
**Task:** Identify exploit paths and hardening steps for {{system_name}}.

## Success criteria
- Done when top risks are ranked with concrete mitigations.
- Judged by: realism of exploit paths and completeness of mitigations.

## Output contract
- Format: Markdown table with columns Vector, Impact, Likelihood, Mitigation.
- Length: 5-8 rows.
- Tone: direct, risk-focused.

## Constraints
- Scope: only the provided architecture and interfaces.
- Assumptions: list explicitly.
- Exclusions: no social engineering.
- If uncertain: ask for missing entry points.

## Inputs (must use)
- Architecture summary: {{architecture_summary}}
- Public endpoints: {{public_endpoints}}
- Auth model: {{auth_model}}
- Data classes: {{data_classes}}

## Verification
- [ ] Each vector has a mitigation
- [ ] Likelihood is Low/Medium/High
- [ ] No unsupported claims

Start the assessment.
`,
};

export default SecurityRedTeamTemplate;
