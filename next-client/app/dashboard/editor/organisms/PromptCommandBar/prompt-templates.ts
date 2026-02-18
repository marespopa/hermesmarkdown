export const PROMPT_TEMPLATES = [
  // ==========================================
  // 1. PROMPT FOUNDATION: The "Standard Library"
  // ==========================================
  {
    key: "/structure",
    category: "Foundation",
    label: "Master Structure",
    description: "The gold standard for complex prompts.",
    template:
      "## Role\nAct as {role}.\n\n## Context\n{background}\n\n## Task\n{describe what to do}\n\n## Constraints\n- MUST: {requirement}\n- NEVER: {forbidden}\n\n## Output format\n{json|markdown|table}\n\n",
  },
  {
    key: "/role",
    category: "Foundation",
    label: "Persona / Expertise",
    description: "Inject domain authority and specific tone.",
    template:
      "## Role\nAct as a senior {role} with 10+ years of experience in {domain}. Your tone should be {direct|empathetic|academic}.\n\n",
  },
  {
    key: "/output",
    category: "Foundation",
    label: "Output Contract",
    description: "Define the exact shape of the response.",
    template:
      "## Output Contract\n- Format: {markdown|json|table}\n- Target Audience: {audience}\n- Key Sections: {list}\n- Tone: {tone}\n- Strict Rule: Do not include preamble or post-analysis.\n\n",
  },

  // ==========================================
  // 2. ENGINEERING: The Inner Loop
  // ==========================================
  {
    key: "/refactor",
    category: "Engineering",
    label: "Smart Refactor",
    description: "Code improvement with focus on patterns.",
    template:
      "## Task\nRefactor the provided code.\n\n## Focus\n- Primary: {performance|readability|DRY}\n- Pattern: {functional|OOP|hooks}\n\n## Constraints\n- Preserve existing public API.\n- Ensure type safety (if TS).\n- Explain 'Why' for major changes.\n\n",
  },
  {
    key: "/review",
    category: "Engineering",
    label: "Code Review",
    description: "Constructive feedback from a senior lens.",
    template:
      "## Task\nPerform a code review on the provided snippet.\n\n## Criteria\n- Edge case handling\n- Security vulnerabilities\n- Naming clarity\n- Big O complexity\n\n## Output\nProvide feedback in 'Issue | Impact | Suggested Fix' format.\n\n",
  },
  {
    key: "/unit-test",
    category: "Engineering",
    label: "Unit Test Gen",
    description: "Test coverage for components or logic.",
    template:
      "## Task\nWrite unit tests for: {target}.\n\n## Tech Stack\n- Framework: {jest|vitest|playwright}\n- Methodology: {AAA|TDD}\n\n## Scenarios\n- Happy path\n- Edge cases: {nulls|empty|errors}\n- Mocking: {services|APIs}\n\n",
  },
  {
    key: "/pr",
    category: "Engineering",
    label: "PR Description",
    description: "Generate a clean pull request summary.",
    template:
      "## Task\nGenerate a PR description based on this diff.\n\n## Sections\n- Summary of changes\n- Why this is needed\n- Breaking changes\n- Testing performed\n\n",
  },

  // ==========================================
  // 3. ARCHITECTURE: The Big Picture
  // ==========================================
  {
    key: "/sysdesign",
    category: "Architecture",
    label: "System Design",
    description: "Blueprint for scalable infrastructure.",
    template:
      "## Objective\nDesign a system for {problem}.\n\n## Requirements\n- Scale: {users|throughput}\n- Availability: {SLAs}\n- Latency: {p99 targets}\n\n## Components\n- Storage: {SQL|NoSQL}\n- Caching: {Redis|CDN}\n- Async: {Queues|Events}\n\n",
  },
  {
    key: "/api",
    category: "Architecture",
    label: "API Specification",
    description: "Define REST or GraphQL endpoints.",
    template:
      "## Task\nDesign an API for {resource}.\n\n## Protocol\n- Style: {REST|GraphQL|gRPC}\n- Auth: {JWT|OAuth2}\n\n## Endpoints\n- Define path, method, request body, and success/error responses.\n\n",
  },

  // ==========================================
  // 4. TRANSFORMATION: Content Operations
  // ==========================================
  {
    key: "/summarize",
    category: "Transformation",
    label: "Executive Summary",
    description: "High-signal, low-noise summary.",
    template:
      "## Task\nSummarize the text for an executive stakeholder.\n\n## Format\n- 1-sentence TL;DR\n- 3-5 high-impact bullet points\n- Required action items (if any)\n\n",
  },
  {
    key: "/explain",
    category: "Transformation",
    label: "Technical Explainer",
    description: "Bridge the gap between tech and business.",
    template:
      "## Task\nExplain {complex_topic} to {audience}.\n\n## Constraints\n- Use an analogy.\n- No jargon without definitions.\n- Highlight the 'Business Value'.\n\n",
  },
  {
    key: "/documentation",
    category: "Transformation",
    label: "Technical Docs",
    description: "Create README or internal documentation.",
    template:
      "## Task\nWrite {README|API|User} documentation.\n\n## Structure\n- Overview\n- Installation/Quickstart\n- Usage Examples\n- Contributing Guidelines\n\n",
  },

  // ==========================================
  // 5. OPERATIONS: Planning & Management
  // ==========================================
  {
    key: "/bug",
    category: "Operations",
    label: "Bug Report",
    description: "Structured report for tracking systems.",
    template:
      "## Bug Report\n- **Summary**: {short_desc}\n- **Actual**: {what_happens}\n- **Expected**: {what_should_happen}\n- **Repro Steps**: \n  1. {step}\n- **Environment**: {env_details}\n\n",
  },
  {
    key: "/plan",
    category: "Operations",
    label: "Sprint Planning",
    description: "Break down a feature into tasks.",
    template:
      "## Goal\nImplement {feature}.\n\n## Task Breakdown\n- Frontend tasks\n- Backend/API tasks\n- Infrastructure/DevOps tasks\n- Testing/QA tasks\n\n## Estimates\nAssign rough complexity (S/M/L) to each.\n\n",
  },
  {
    key: "/skill",
    category: "Operations",
    label: "Knowledge Protocol",
    description: "Standardize a repeatable workflow (The 'Skill' format).",
    template:
      "# Skill: {Skill Name}\n> Status: {Draft|Active} | Scope: {Domain}\n\n## 1. Logic & Flow\n1. Analyze: {Input criteria}\n2. Transform: {Logic applied}\n3. Format: {Final shape}\n\n## 2. Examples\nInput: {In}\nOutput: {Out}\n\n## 3. Constraints\n- Never {forbidden_action}\n- Always {required_action}\n",
  },
];
