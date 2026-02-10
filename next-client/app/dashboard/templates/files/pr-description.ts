import { MarkdownTemplate } from "..";

const PrDescriptionTemplate: MarkdownTemplate = {
  filename: "pr-description",
  frontMatter: {
    title: "PR Description",
    description: "Produce a crisp PR summary with risks and testing proof.",
    tags: "communication,pr,engineering",
  },
  content: `# PR Description: {{pr_title}}

**Role:** Release Engineer
**Task:** Write a PR description for {{repo_name}}.

## Success criteria
- Done when scope, risks, and test evidence are explicit.
- Judged by: clarity, completeness, and accuracy.

## Output contract
- Format: Markdown with sections Summary, Changes, Risks, Tests, Rollback.
- Length: <= 25 lines.
- Tone: direct and technical.

## Constraints
- Scope: only the provided diff and context.
- Assumptions: list explicitly.
- Exclusions: no new tasks or roadmap items.
- If uncertain: ask 1-2 clarifying questions.

## Inputs
- Diff summary: {{diff_summary}}
- Key files: {{key_files}}
- Test results: {{test_results}}

## Verification
- [ ] Each risk has a mitigation
- [ ] Tests section references real commands
- [ ] Rollback is a single sentence
`,
};

export default PrDescriptionTemplate;
