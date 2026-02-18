export const PROMPT_TEMPLATES = [
  // SKILL DOCUMENTATION: Standardized skill doc template
  {
    key: "/skill",
    category: "Technical",
    label: "Skill Documentation",
    description: "Document a skill with summary, scope, logic, and examples.",
    template:
      "# Skill: {Skill Name}\n> Version: {Version} | Status: {Status} | Author: {Author}\n\n## 1. Executive Summary\n{High-level purpose and when to use}\n\n## 2. Capabilities & Scope\n- Can: {Capability A}\n- Can: {Capability B}\n- Cannot: {Limitation A}\n\n## 3. Logic & Methodology (The \"Protocol\")\n1. Analyze: {How to evaluate the input}\n2. Process: {Core transformation or calculation}\n3. Validate: {How to verify output quality}\n\n## 4. Reference Knowledge\n- Standard: {Standard name/link}\n- Rule: {Specific constraint or regex pattern}\n\n## 5. Few-Shot Examples\n### Example 1\nInput: > {Example Input}\n\nOutput:\n> {Expected Output}\n\n---\n# ⚠️ Constraints\n- Always output in {Format}.\n- Never use {Forbidden Terminology}.\n",
  },
  // PROMPT FOUNDATION: Build strong prompts from scratch
  {
    key: "/structure",
    category: "Prompt foundation",
    label: "Prompt structure",
    description: "Scaffold a complete prompt layout.",
    template: "## Role\nAct as a {role}.\n\n## Context\n{background}\n\n## Task\n{describe what to do}\n\n## Constraints\n- MUST: {requirement}\n- Do not: {forbidden}\n\n## Output format\n{json|markdown|table}\n\n",
  },
  {
    key: "/role",
    category: "Prompt foundation",
    label: "Role / Persona",
    description: "Set persona for better accuracy (+15 clarity).",
    template: "## Role\nAct as a senior {role} with expertise in {domain}.\n\n",
  },
  {
    key: "/success",
    category: "Prompt foundation",
    label: "Success criteria",
    description: "Define what done means and how to judge it.",
    template: "## Success criteria\n- Done when: {definition}\n- Judged by: {metrics}\n\n",
  },
  {
    key: "/plan",
    category: "Prompt foundation",
    label: "Plan",
    description: "Outline steps, milestones, and verification.",
    template: "## Plan\n1. {step}\n2. {step}\n3. {step}\n\n## Verification\n- [ ] {check}\n- [ ] {check}\n\n",
  },
  {
    key: "/constraints",
    category: "Prompt foundation",
    label: "Constraints",
    description: "Scope, assumptions, exclusions, and uncertainty handling.",
    template: "## Constraints\n- Scope: {in|out}\n- Assumptions: {list}\n- Exclusions: {list}\n- If uncertain: {ask|offer options}\n\n",
  },
  {
    key: "/avoid",
    category: "Prompt foundation",
    label: "Negative constraints",
    description: "Tell LLM what NOT to do (+10 clarity).",
    template: "## Avoid\n- Do not include preamble or explanations\n- Never assume {assumption}\n- Avoid {behavior}\n- Skip {content}\n- Omit {section}\n\n",
  },
  {
    key: "/inputs",
    category: "Prompt foundation",
    label: "Inputs",
    description: "Minimum context and required data sources.",
    template: "## Inputs\n- Minimum context: {list}\n- Must use data: {sources}\n\n",
  },
  {
    key: "/context",
    category: "Prompt foundation",
    label: "Context / Background",
    description: "Provide background information (+10 clarity).",
    template: "## Context\nBackground: {situation}\nAudience: {who will use this}\nTone: {professional|casual|technical}\nScenario: {specific situation}\n\n",
  },
  {
    key: "/output",
    category: "Prompt foundation",
    label: "Output contract",
    description: "Specify format, length, tone, and required sections.",
    template: "## Output contract\n- Format: {json|markdown|table}\n- Length: {max} \n- Tone: {tone}\n- Required sections: {list}\n\n",
  },

  // PROMPT REFINEMENT: Polish and validate what you wrote
  {
    key: "/verify",
    category: "Prompt refinement",
    label: "Verification",
    description: "Checklist to catch common failures.",
    template: "## Verification\n- [ ] {check}\n- [ ] {check}\n- [ ] {check}\n\n",
  },
  {
    key: "/examples",
    category: "Prompt refinement",
    label: "Examples",
    description: "Add 1-3 examples when format or style matters.",
    template: "## Examples\n1) Input: {input}\n   Output: {output}\n\n",
  },
  {
    key: "/iterate",
    category: "Prompt refinement",
    label: "Iteration",
    description: "Ask clarifying questions or propose alternatives.",
    template: "## Iteration\n- If confidence < {threshold}, ask: {questions}\n- If blocked, propose: {alternatives}\n\n",
  },
  {
    key: "/critique",
    category: "Prompt refinement",
    label: "Critique",
    description: "Highlight gaps, logic, and clarity issues.",
    template: "## Task\nCritique the content.\n\n## Focus\n- Clarity\n- Logic\n- Gaps\n\n## Output format\n- Issue\n- Why it matters\n- Suggested fix\n\n",
  },

  // CONTENT TRANSFORMATION: Daily operations on existing content
  {
    key: "/summarize",
    category: "Content transformation",
    label: "Summarize",
    description: "Condense content into short bullets.",
    template: "## Task\nSummarize the content.\n\n## Output format\n- Bullet points\n- <= 8 bullets\n\n",
  },
  {
    key: "/extract",
    category: "Content transformation",
    label: "Extract action items",
    description: "Pull actionable items with owners.",
    template: "## Task\nExtract action items.\n\n## Output format\n- [ ] Action item\n- Owner: {name}\n\n",
  },
  {
    key: "/outline",
    category: "Content transformation",
    label: "Outline",
    description: "Create a structured outline with headings.",
    template: "## Task\nCreate an outline.\n\n## Depth\n{h2|h3}\n\n## Format\nMarkdown headings\n\n",
  },
  {
    key: "/explain",
    category: "Content transformation",
    label: "Explain",
    description: "Explain for a target audience with examples.",
    template: "## Task\nExplain this for {audience}.\n\n## Output format\n- Plain language\n- Example\n- Key takeaway\n\n",
  },
  {
    key: "/rewrite",
    category: "Content transformation",
    label: "Rewrite",
    description: "Adapt tone and audience while preserving meaning.",
    template: "## Task\nRewrite for {audience}.\n\n## Tone\n{tone}\n\n## Keep\n{must-keep}\n\n",
  },
  {
    key: "/fix",
    category: "Content transformation",
    label: "Fix grammar",
    description: "Improve clarity without changing meaning.",
    template: "## Task\nFix grammar and clarity.\n\n## Constraints\n- Keep meaning\n\n",
  },
  {
    key: "/translate",
    category: "Content transformation",
    label: "Translate",
    description: "Translate while preserving key terms.",
    template: "## Task\nTranslate to {language}.\n\n## Preserve\n- Names\n- Code\n- Terms\n\n",
  },
  {
    key: "/compare",
    category: "Content transformation",
    label: "Compare",
    description: "Side-by-side comparison by criteria.",
    template: "## Task\nCompare A vs B.\n\n## Criteria\n- {list}\n\n## Output format\n| Criteria | A | B |\n| --- | --- | --- |\n\n",
  },

  // CONTENT GENERATION: Create new content
  {
    key: "/idea",
    category: "Content generation",
    label: "Brainstorm",
    description: "Generate multiple ideas with constraints.",
    template: "## Task\nGenerate {n} ideas.\n\n## Constraints\n{constraints}\n\n## Output format\n1.\n2.\n3.\n\n",
  },
  {
    key: "/steps",
    category: "Content generation",
    label: "Step-by-step",
    description: "Break work into ordered steps.",
    template: "## Task\nCreate step-by-step instructions.\n\n## Output format\n1.\n2.\n3.\n\n",
  },
  {
    key: "/email",
    category: "Content generation",
    label: "Write email",
    description: "Draft an email with tone and subject.",
    template: "## Task\nDraft an email.\n\n## Audience\n{recipient}\n\n## Tone\n{tone}\n\n## Output format\nSubject: {subject}\n\nBody:\n",
  },
  {
    key: "/spec",
    category: "Content generation",
    label: "Spec outline",
    description: "Outline a concise product or feature spec.",
    template: "## Task\nCreate a spec outline.\n\n## Output format\n- Goal\n- Non-goals\n- Requirements\n- Constraints\n- Open questions\n\n",
  },
  {
    key: "/meeting",
    category: "Content generation",
    label: "Meeting summary",
    description: "Summarize decisions, actions, and questions.",
    template: "## Task\nSummarize the meeting.\n\n## Output format\n- Decisions\n- Action items\n- Open questions\n\n",
  },
  {
    key: "/todo",
    category: "Content generation",
    label: "Turn into tasks",
    description: "Convert content into actionable tasks.",
    template: "## Task\nTurn this into tasks.\n\n## Output format\n- [ ] Task\n- Owner: {name}\n- Due: {date}\n\n",
  },
  {
    key: "/task",
    category: "Content generation",
    label: "Task definition",
    description: "Define a single task with context and acceptance criteria.",
    template: "## Task\n{description}\n\n## Context\n{background}\n\n## Acceptance criteria\n- [ ] {criterion}\n- [ ] {criterion}\n\n## Priority\n{high|medium|low}\n\n",
  },

  // TECHNICAL: Developer-focused templates
  {
    key: "/documentation",
    category: "Technical",
    label: "Documentation",
    description: "Write user or developer documentation.",
    template:
      "## Task\nWrite documentation for {feature|component}.\n\n## Audience\n{users|developers}\n\n## Coverage\n- Overview\n- Usage\n- API\n- Examples\n- Edge cases\n\n## Output format\n- Markdown\n- Include code examples\n\n",
  },
  {
    key: "/refactor",
    category: "Technical",
    label: "Refactor",
    description: "Refactor code or components safely.",
    template:
      "## Task\nRefactor {file|component|module}.\n\n## Goals\n- Improve: {readability|performance|maintainability}\n- Preserve behavior\n\n## Constraints\n- Keep public API stable\n- Update tests if needed\n- Avoid breaking changes\n\n## Output format\n- Summary of changes\n- Updated code\n\n",
  },
  {
    key: "/code",
    category: "Technical",
    label: "Code help",
    description: "Generate code with language and style hints.",
    template: "## Task\nWrite code for {goal}.\n\n## Constraints\n- Language: {language}\n- Style: {style}\n\n## Output format\n```{language}\n...\n```\n\n",
  },
  {
    key: "/unit-test",
    category: "Technical",
    label: "Unit test",
    description: "Write unit tests for a component.",
    template:
      "## Task\nWrite unit tests for the component.\n\n## Context\n- Component: {name}\n- Behavior: {behavior}\n- Edge cases: {edge-cases}\n\n## Constraints\n- Test runner: {jest|vitest}\n- Rendering: {rtl|enzyme}\n- Style: {arrange-act-assert}\n\n## Output format\n```{language}\n...\n```\n\n",
  },
  {
    key: "/test",
    category: "Technical",
    label: "Test cases",
    description: "Generate test scenarios and expected results.",
    template: "## Task\nGenerate test cases.\n\n## Output format\n- Scenario\n- Steps\n- Expected result\n\n",
  },
  {
    key: "/sql",
    category: "Technical",
    label: "SQL help",
    description: "Draft SQL with tables and constraints.",
    template: "## Task\nWrite SQL for {goal}.\n\n## Tables\n- {table}: {columns}\n\n## Output format\n```sql\nSELECT ...\n```\n\n",
  },
  {
    key: "/bug",
    category: "Technical",
    label: "Bug report",
    description: "Short bug report scaffold.",
    template:
      "## Bug\n- Expected: {expected}\n- Actual: {actual}\n- Steps: {steps}\n- Environment: {env}\n\n",
  },
  {
    key: "/issue",
    category: "Technical",
    label: "Issue to prompt",
    description: "Research issue first, then generate a spec-first prompt.",
    template:
      "## Issue\n- Title: {title}\n- Goal: {goal}\n- Context: {context}\n- Constraints: {constraints}\n\n",
  },

  // SPECIALIZED: Niche and advanced templates
  {
    key: "/qa",
    category: "Specialized",
    label: "Q&A",
    description: "Generate question and answer pairs.",
    template: "## Task\nGenerate Q&A.\n\n## Output format\nQ: {question}\nA: {answer}\n\n",
  },
  {
    key: "/rubric",
    category: "Specialized",
    label: "Scoring rubric",
    description: "Build a criteria-based scoring rubric.",
    template: "## Task\nCreate a scoring rubric.\n\n## Criteria\n- {criterion}: {weight}\n\n## Output format\n- Score 1-5 with descriptors\n\n",
  },
  {
    key: "/generic",
    category: "Specialized",
    label: "Generic prompt",
    description: "Quick structure for goals, constraints, and output.",
    template: "## Goal\n{goal}\n\n## Constraints\n- {constraint}\n\n## Output\n- Format: {format}\n- Length: {length}\n- Tone: {tone}\n\n",
  },
];
