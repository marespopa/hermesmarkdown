import { MarkdownTemplate } from "..";

const ComponentRefactorTemplate: MarkdownTemplate = {
  filename: "component-refactor",
  frontMatter: {
    title: "Component Refactor Logic",
    description: "Example refactor prompt focused on performance and security risks.",
    tags: "coding,gemini,performance",
  },
  content: `# Component Refactor - React List Rendering

**Role:** Senior Frontend Engineer
**Task:** Refactor a slow list component for React 19.

## Success criteria
- Done when rendering time improves and the refactor removes unnecessary re-renders.
- Judged by: complexity analysis, correctness of memoization, and clear justifications.

## Output contract
- Format: Markdown with sections: Findings, Refactor Plan, Updated Code, Justifications.
- Length: <= 60 lines total.
- Tone: direct, engineering-focused.

## Constraints
- Scope: only refactor the provided component and its props usage.
- Assumptions: list any dependency or data shape assumptions.
- Exclusions: no UI redesign or new dependencies.
- If uncertain: ask up to 2 clarifying questions.

## Inputs (must use)
- Framework: React 19
- Data size: up to 10,000 rows
- Code:
~~~tsx
function ResultsTable({ rows, onSelect }) {
  const [query, setQuery] = useState("");
  const filtered = rows.filter(r => r.name.includes(query));
  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {filtered.map((row, index) => (
        <Row key={index} row={row} onSelect={onSelect} />
      ))}
    </div>
  );
}
~~~

## Example
If you introduce "useMemo", show the exact dependency list and why.

## Verification
- [ ] Notes any O(n^2) or unstable keys
- [ ] Updated code compiles as-is
- [ ] Justifications are one sentence each

Begin the refactor.
`,
};

export default ComponentRefactorTemplate;
