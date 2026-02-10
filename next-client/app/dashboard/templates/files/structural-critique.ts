import { MarkdownTemplate } from "..";

const StructuralCritiqueTemplate: MarkdownTemplate = {
  filename: "structural-critique",
  frontMatter: {
    title: "Structural Critique",
    description: "Example prompt to critique a technical RFC with clear structure fixes.",
    tags: "writing,documentation,logic",
  },
  content: `# Structural Critique - API Rate Limit RFC

**Role:** Staff Engineer Reviewer
**Task:** Critique the structure of an internal RFC.

## Success criteria
- Done when the critique identifies logic gaps, structural issues, and a revised outline.
- Judged by: specificity of gaps and practicality of the new outline.

## Output contract
- Format: Markdown with sections: Logic Gaps, Structural Problems, Cut List, Revised Outline.
- Length: <= 40 lines.
- Tone: precise and constructive.

## Constraints
- Scope: structure and logic only, no copyediting.
- Assumptions: note any missing context.
- Exclusions: do not rewrite the full document.
- If uncertain: ask for missing sections.

## Inputs (must use)
- Document:
"""
Title: API Rate Limiting
Sections: Background, Proposal, Risks, Rollout
Summary: Proposes per-user limits to protect downstream services.
"""

## Examples
- A logic gap example: "Risk section does not address impact on internal batch jobs."

## Verification
- [ ] Exactly 5 logic gaps
- [ ] Cut list contains concrete bullet items
- [ ] Revised outline uses clear section names

Provide the critique now.
`,
};

export default StructuralCritiqueTemplate;
