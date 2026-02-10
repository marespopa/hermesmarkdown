import { MarkdownTemplate } from "..";

const ReleaseNotesTemplate: MarkdownTemplate = {
  filename: "release-notes",
  frontMatter: {
    title: "Release Notes",
    description: "Summarize changes for a release with impact and rollout info.",
    tags: "communication,release,product",
  },
  content: `# Release Notes: {{release_name}}

**Role:** Release Manager
**Task:** Draft release notes for {{release_name}}.

## Success criteria
- Done when user impact, changes, and known issues are clear.
- Judged by: accuracy and readability.

## Output contract
- Format: Markdown with sections Highlights, Changes, Fixes, Known Issues, Rollout.
- Length: <= 35 lines.
- Tone: concise and factual.

## Constraints
- Scope: only shipped changes.
- Assumptions: list explicitly.
- Exclusions: no roadmap promises.
- If uncertain: ask for missing changelog entries.

## Inputs
- Changelog: {{changelog}}
- Affected areas: {{affected_areas}}
- Rollout plan: {{rollout_plan}}

## Verification
- [ ] Each change maps to a changelog item
- [ ] Known issues include workaround if available
- [ ] Rollout includes timing
`,
};

export default ReleaseNotesTemplate;
