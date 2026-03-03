export interface PromptTemplate {
  key: string;
  category:
    | "Foundation"
    | "Engineering"
    | "Architecture"
    | "Transformation"
    | "Operations"
    | "Utility";
  label: string;
  description: string;
  template: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // ==========================================
  // 1. PROMPT FOUNDATION: The "Standard Library"
  // ==========================================
  {
    key: "/structure",
    category: "Foundation",
    label: "Master Structure",
    description: "Scoped containers for maximum reliability.",
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
    key: "/context",
    category: "Foundation",
    label: "Context Block",
    description: "Set the background or environment.",
    template:
      "<context>\n{Provide background information or situational awareness}\n</context>\n\n",
  },
  {
    key: "/task",
    category: "Foundation",
    label: "Task Definition",
    description: "The core action requirement.",
    template: "<task>\n{Describe the specific objective}\n</task>\n\n",
  },
  {
    key: "/constraints",
    category: "Foundation",
    label: "Guardrails",
    description: "Define strict boundaries.",
    template:
      "<constraints>\n- **MUST**: {requirement}\n- **NEVER**: {forbidden}\n</constraints>\n\n",
  },

  // ==========================================
  // 2. ENGINEERING: The Inner Loop
  // ==========================================
  {
    key: "/debug-cot",
    category: "Engineering",
    label: "Chain of Thought Debug",
    description: "Step-by-step root cause analysis.",
    template:
      "<task>\nPerform a root-cause analysis and provide a fix for the reported issue.\n</task>\n\n<debug_context>\n- Symptoms: {error}\n- Environment: {stack}\n- Trace: {paste_logs}\n</debug_context>\n\n<constraints>\n- Use Chain-of-Thought reasoning.\n- Verify fix against edge cases.\n</constraints>\n\n",
  },
  {
    key: "/refactor",
    category: "Engineering",
    label: "Smart Refactor",
    description: "Code improvement with logical isolation.",
    template:
      "<task>\nRefactor the provided code to improve {performance|readability|DRY}.\n</task>\n\n<context>\nTarget Pattern: {functional|OOP|hooks}\n</context>\n\n<constraints>\n- Zero breaking changes to the public API.\n- Maintain 100% type safety.\n</constraints>\n\n",
  },
  {
    key: "/review",
    category: "Engineering",
    label: "Code Review",
    description: "Senior-level audit with structured feedback.",
    template:
      "<task>\nAudit the provided code for logic, security, and performance bottlenecks.\n</task>\n\n<output_contract>\nProvide feedback in a 'File | Line | Issue | Severity | Suggestion' table.\n</output_contract>\n\n",
  },
  {
    key: "/sec-audit",
    category: "Engineering",
    label: "Security Audit",
    description: "Identify OWASP vulnerabilities.",
    template:
      "<task>\nAnalyze the code for security vulnerabilities (Injection, Auth, Sensitive Data).\n</task>\n\n<constraints>\n- Reference OWASP standards.\n- Provide a secure remediation snippet for every finding.\n</constraints>\n\n",
  },

  // ==========================================
  // 3. ARCHITECTURE: The Big Picture
  // ==========================================
  {
    key: "/adr",
    category: "Architecture",
    label: "Arch Decision Record",
    description: "Document the 'Why' behind tech choices.",
    template:
      "<task>\nDraft an Architecture Decision Record (ADR) for {system}.\n</task>\n\n<context>\nProblem Statement: {problem}\nConstraints: {budget|latency|compliance}\n</context>\n\n<output_structure>\n1. Context, 2. Decision, 3. Status, 4. Consequences.\n</output_structure>\n\n",
  },
  {
    key: "/sysdesign",
    category: "Architecture",
    label: "System Design",
    description: "Blueprint for scalable infrastructure.",
    template:
      "<task>\nDesign a high-level system architecture for {problem}.\n</task>\n\n<requirements>\nScale: {users}, Availability: {SLAs}, Latency: {p99}\n</requirements>\n\n<constraints>\nPrioritize {consistency|availability} per CAP theorem.\n</constraints>\n\n",
  },

  // ==========================================
  // 4. TRANSFORMATION: Data & Migration
  // ==========================================
  {
    key: "/transform",
    category: "Transformation",
    label: "Code Translator",
    description: "Migrate logic across languages/styles.",
    template:
      "<task>\nTranslate the provided code from {Source} to {Target}.\n</task>\n\n<constraints>\n- Preserve original business logic exactly.\n- Apply idiomatic patterns of the {Target} language.\n</constraints>\n\n",
  },
  {
    key: "/mock-data",
    category: "Transformation",
    label: "Mock Data Gen",
    description: "Generate JSON based on schema.",
    template:
      "<task>\nGenerate {count} realistic mock data records.\n</task>\n\n<schema>\n{Paste Interface or Type}\n</schema>\n\n<constraints>\n- Output valid JSON only.\n- Include edge cases (nulls, empty strings).\n</constraints>\n\n",
  },

  // ==========================================
  // 5. OPERATIONS: Planning & Tracking
  // ==========================================
  {
    key: "/bug",
    category: "Operations",
    label: "Bug Report",
    description: "Structured bug tracking container.",
    template:
      "<task>\nDocument a technical bug report for the engineering team.\n</task>\n\n<bug_context>\n- Summary: {desc}\n- Actual: {what_happened}\n- Expected: {what_should_happen}\n- Steps: {reproduction_steps}\n</bug_context>\n\n",
  },
  {
    key: "/plan",
    category: "Operations",
    label: "Sprint Planning",
    description: "Feature breakdown into task containers.",
    template:
      "<task>\nBreak down the following feature into actionable engineering sub-tasks.\n</task>\n\n<goal>\n{Implement Feature X}\n</goal>\n\n<output_contract>\nGroup by: Frontend, Backend, Database, Infrastructure.\n</output_contract>\n\n",
  },
  {
    key: "/pr",
    category: "Operations",
    label: "PR Description",
    description: "Generate a clean pull request summary.",
    template:
      "<task>\nGenerate a professional Pull Request description based on the provided diff.\n</task>\n\n<structure>\n- Overview, Rationale, Breaking Changes, Test Plan.\n</structure>\n\n",
  },

  // ==========================================
  // 6. UTILITY: Quick Actions
  // ==========================================
  {
    key: "/pdf",
    category: "Utility",
    label: "Export to PDF",
    description: "Export current document as PDF.",
    template: "/pdf",
  },
  {
    key: "/table",
    category: "Utility",
    label: "Open Table Editor",
    description: "Open the Table Editor modal.",
    template: "/table",
  },
];
