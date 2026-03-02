export const PROMPT_TEMPLATES = [
  // ==========================================
  // 1. PROMPT FOUNDATION: The "Standard Library"
  // ==========================================
  {
    key: "/structure",
    category: "Foundation",
    label: "Master Structure",
    description:
      "2026 Gold Standard: Scoped containers for maximum reliability.",
    template:
      "<role>\nAct as {role}.\n</role>\n\n<context>\n{background}\n</context>\n\n<task>\n{describe what to do}\n</task>\n\n<constraints>\n- **MUST**: {requirement}\n- **NEVER**: {forbidden}\n- **OUTPUT**: {json|markdown|table}\n</constraints>\n\n",
  },
  {
    key: "/role",
    category: "Foundation",
    label: "Persona / Expertise",
    description: "Inject domain authority via identity scoping.",
    template:
      "<role>\nAct as a senior {role} with 10+ years of experience in {domain}. Your tone should be {direct|empathetic|academic}.\n</role>\n\n",
  },
  {
    key: "/output",
    category: "Foundation",
    label: "Output Contract",
    description: "Define the exact physical shape of the response.",
    template:
      "<output_contract>\n- **Format**: {markdown|json|table}\n- **Target Audience**: {audience}\n- **Key Sections**: {list}\n- **Strict Rule**: No conversational preamble or post-analysis.\n</output_contract>\n\n",
  },
  {
    key: "/agent",
    category: "Orchestration",
    label: "Agent Definition",
    description: "The master orchestration template for full AI profiles.",
    template:
      "<agent_profile>\n<identity>\nAct as a {role} specializing in {expertise}. Personality: {personality_traits}.\n</identity>\n\n<mission>\nEnvironment: {environment}. Primary Goal: {primary_goal}.\n</mission>\n\n<rules>\n- **Directive**: Always {must_do}.\n- **Hard Constraints**: Never {must_not_do}.\n</rules>\n\n<knowledge>\nPrioritize {source_type} with {confidence_level} detail.\n</knowledge>\n</agent_profile>\n\n",
  },

  // ==========================================
  // 2. ENGINEERING: The Inner Loop
  // ==========================================
  {
    key: "/refactor",
    category: "Engineering",
    label: "Smart Refactor",
    description: "Code improvement with logical isolation.",
    template:
      "<task>\nRefactor the provided code focusing on {performance|readability|DRY}.\n</task>\n\n<context>\nPattern: {functional|OOP|hooks}.\n</context>\n\n<constraints>\n- Preserve public API.\n- Ensure type safety.\n- Explain 'Why' for major changes.\n</constraints>\n\n",
  },
  {
    key: "/review",
    category: "Engineering",
    label: "Code Review",
    description: "Senior-level audit with structured feedback.",
    template:
      "<task>\nPerform a code review on the provided snippet.\n</task>\n\n<criteria>\n- Edge cases, Security, Naming, Big O.\n</criteria>\n\n<output_format>\nProvide feedback in 'Issue | Impact | Suggested Fix' table.\n</output_format>\n\n",
  },
  {
    key: "/unit-test",
    category: "Engineering",
    label: "Unit Test Gen",
    description: "Test coverage generator.",
    template:
      "<task>\nWrite unit tests for: {target}.\n</task>\n\n<stack>\n- Framework: {jest|vitest|playwright}\n- Methodology: {AAA|TDD}\n</stack>\n\n<scenarios>\nHappy path, {nulls|empty|errors}, and mocks.\n</scenarios>\n\n",
  },
  {
    key: "/pr",
    category: "Engineering",
    label: "PR Description",
    description: "Generate a clean pull request summary.",
    template:
      "<task>\nGenerate a PR description based on this diff.\n</task>\n\n<structure>\n- Summary, Rationale, Breaking Changes, Test Plan.\n</structure>\n\n",
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
      "<objective>\nDesign a system for {problem}.\n</objective>\n\n<requirements>\nScale: {users}, Availability: {SLAs}, Latency: {p99}.\n</requirements>\n\n<components>\nStorage: {SQL|NoSQL}, Caching: {Redis|CDN}, Async: {Queues}.\n</components>\n\n",
  },
  {
    key: "/api",
    category: "Architecture",
    label: "API Specification",
    description: "Define REST or GraphQL endpoints.",
    template:
      "<task>\nDesign an API for {resource}.\n</task>\n\n<protocol>\nStyle: {REST|GraphQL}, Auth: {JWT|OAuth2}.\n</protocol>\n\n<endpoints>\nDefine path, method, request body, and responses.\n</endpoints>\n\n",
  },

  // ==========================================
  // 4. TRANSFORMATION: Content Operations
  // ==========================================
  {
    key: "/summarize",
    category: "Transformation",
    label: "Executive Summary",
    description: "High-signal summary container.",
    template:
      "<task>\nSummarize text for executive stakeholders.\n</task>\n\n<format>\n- 1-sentence TL;DR\n- 3-5 high-impact bullets\n- Action items\n</format>\n\n",
  },
  {
    key: "/explain",
    category: "Transformation",
    label: "Technical Explainer",
    description: "Bridge tech and business gaps.",
    template:
      "<task>\nExplain {complex_topic} to {audience}.\n</task>\n\n<constraints>\n- Use analogy, No jargon, Highlight Business Value.\n</constraints>\n\n",
  },
  {
    key: "/documentation",
    category: "Transformation",
    label: "Technical Docs",
    description: "Create README or internal documentation.",
    template:
      "<task>\nWrite {README|API|User} documentation.\n</task>\n\n<structure>\nOverview, Installation, Usage, Contributing.\n</structure>\n\n",
  },

  // ==========================================
  // 5. OPERATIONS: Planning & Management
  // ==========================================
  {
    key: "/bug",
    category: "Operations",
    label: "Bug Report",
    description: "Structured bug tracking container.",
    template:
      "<bug_report>\n- **Summary**: {short_desc}\n- **Actual/Expected**: {details}\n- **Steps**: {1, 2, 3}\n- **Env**: {env_details}\n</bug_report>\n\n",
  },
  {
    key: "/plan",
    category: "Operations",
    label: "Sprint Planning",
    description: "Feature breakdown into task containers.",
    template:
      "<goal>\nImplement {feature}.\n</goal>\n\n<breakdown>\nFrontend, Backend, Infra, QA.\n</breakdown>\n\n<estimates>\nComplexity: S/M/L.\n</estimates>\n\n",
  },
  {
    key: "/skill",
    category: "Operations",
    label: "Knowledge Protocol",
    description: "Standardized workflow 'Skill' format.",
    template:
      '<skill name="{Skill Name}">\n<logic>\n1. Analyze criteria, 2. Transform logic, 3. Format shape.\n</logic>\n\n<examples>\nIn: {In} -> Out: {Out}\n</examples>\n\n<constraints>\nAlways {required}, Never {forbidden}.\n</constraints>\n</skill>\n',
  },

  // ==========================================
  // 6. UTILITY: Quick Actions & Tools
  // ==========================================
  {
    key: "/pdf",
    category: "Utility",
    label: "Export to PDF",
    description: "Export the current document as a PDF file.",
    template: "/pdf",
  },
  {
    key: "/table",
    category: "Utility",
    label: "Open Table Editor",
    description: "Open the Table Editor modal.",
    template: "/table",
  },
  {
    key: "/timer",
    category: "Utility",
    label: "Toggle Timer",
    description: "Show or hide the status bar timer.",
    template: "/timer",
  },
];
