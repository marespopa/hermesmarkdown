import { MarkdownTemplate } from "..";

const GenericTaskTemplate: MarkdownTemplate = {
  filename: "generic-task",
  frontMatter: {
    title: "General Task",
    description: "A contract-style prompt for any task with clear outputs.",
    tags: "general,contract,starter",
  },
  content: `# General Task: {{task_name}}

**Role:** {{role}}
**Task:** {{task_description}}

## Success criteria
- Done when {{done_definition}}.
- Judged by: {{quality_checks}}.

## Output contract
- Format: {{format}}
- Length: {{length}}
- Tone: {{tone}}
- Required sections: {{required_sections}}

## Constraints
- Scope: {{scope}}
- Assumptions: {{assumptions}}
- Exclusions: {{exclusions}}
- If uncertain: {{uncertainty_policy}}

## Inputs (must use)
- Context: {{context}}
- Data: {{data_sources}}

## Examples
1) Input: {{example_input}}
   Output: {{example_output}}

## Verification
- [ ] {{check_1}}
- [ ] {{check_2}}
- [ ] {{check_3}}

## Iteration
- If confidence < {{confidence_threshold}}, ask: {{clarifying_questions}}
- If blocked, propose: {{alternatives}}
`,
};

export default GenericTaskTemplate;
