import { MarkdownTemplate } from "..";

const UnitTestSuiteTemplate: MarkdownTemplate = {
  filename: "unit-test-suite",
  frontMatter: {
    title: "Unit Test Suite",
    description: "Generate robust tests with high branch coverage.",
    tags: "testing,qa,javascript,typescript",
  },
  content: `# Unit Test Suite: {{function_name}}

**Role:** Lead SDET (Software Development Engineer in Test)
**Task:** Generate a {{framework}} test suite for the provided snippet.

## Testing goals
1. **Happy Path:** Standard execution flows.
2. **Boundary Analysis:** Max/Min values, empty strings, and null states.
3. **Negative Testing:** Ensure proper error codes are thrown for invalid inputs.

## Output contract
- Code: coverage-focused test suite.
- Mocks: Use {{mock_library}} for external API calls.

## Inputs
- Source Code: {{source_code}}
- Framework: {{vitest_jest_etc}}

## Verification
- [ ] Tests use AAA (Arrange-Act-Assert) pattern
- [ ] All edge cases from {{business_rules}} are covered
`,
};

export default UnitTestSuiteTemplate;
