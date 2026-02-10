import { MarkdownTemplate } from "..";

const DatabaseSchemaTemplate: MarkdownTemplate = {
  filename: "database-schema",
  frontMatter: {
    title: "DB Schema Architect",
    description: "Design normalized, high-performance SQL schemas.",
    tags: "database,architecture,sql",
  },
  content: `# Database Schema Design: {{system_name}}

**Role:** Senior Data Architect
**Task:** Design a third-normal form (3NF) SQL schema for {{use_case}}.

## Success criteria
- Done when schema supports all business requirements with proper normalization.
- Judged by: performance characteristics, referential integrity, and scalability.

## Output contract
- Format: Markdown with SQL DDL code blocks + Mermaid.js ERD.
- Length: Complete DDL for all tables, indexes, and constraints.
- Tone: Technical and precise.
- Required sections: Tables, Indexes, ERD diagram.

## Constraints
- DO NOT use generic types; specify Postgres-compliant types (e.g., TIMESTAMPTZ, JSONB).
- MUST include foreign key constraints and indexes for high-traffic columns.
- MUST explain the sharding or partitioning strategy if storage exceeds {{size_gb}}GB.
- Assumptions: list explicitly.

## Inputs (must use)
- Business requirements: {{business_logic}}
- Database engine: {{postgres_mysql_etc}}
- Expected data volume: {{expected_rows}}

## Verification
- [ ] Schema is in 3NF
- [ ] Mermaid ERD diagram is valid and complete
- [ ] Indexes provided for query optimization
- [ ] Foreign keys enforce referential integrity
`,
};

export default DatabaseSchemaTemplate;
