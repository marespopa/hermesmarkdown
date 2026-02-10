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

## Constraints
- DO NOT use generic types; specify Postgres-compliant types (e.g., TIMESTAMPTZ, JSONB).
- INCLUDE foreign key constraints and indexes for high-traffic columns.
- EXPLAIN the sharding or partitioning strategy if storage exceeds {{size_gb}}GB.

## Output contract
- Format: SQL DDL + Mermaid.js Entity Relationship Diagram (ERD).
- Note: Highlight potential hotspots for write-locks.

## Inputs
- Requirements: {{business_logic}}
- Database: {{postgres_mysql_etc}}

## Verification
- [ ] Schema is in 3NF
- [ ] Mermaid diagram is valid
- [ ] Indexes are provided for query optimization
`,
};

export default DatabaseSchemaTemplate;
