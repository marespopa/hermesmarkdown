import { COMPANION_SKILL_TOOL_BINDINGS } from "@/app/services/companion-tool-defs";
import { PROJECT_CHECKS, type ProjectCheckId } from "@/app/services/project-checks";
import type { CompanionToolName } from "@/app/services/companion-tool-defs";

const FRONTMATTER = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const TOOLS = new Set<string>(COMPANION_SKILL_TOOL_BINDINGS);
const CHECKS = new Set<string>(PROJECT_CHECKS.map(({ id }) => id));

export interface ParsedSkillDocument {
  frontmatter: Record<string, unknown>;
  body: string;
  description?: string;
  toolBindings?: CompanionToolName[];
  projectChecks?: ProjectCheckId[];
  errors: string[];
}

// Reads known fields only. The Markdown body remains inert text and is never
// imported, evaluated, interpolated as code, or treated as a command.
export async function parseSkillDocument(source: string): Promise<ParsedSkillDocument> {
  const match = FRONTMATTER.exec(source);
  const body = match ? source.slice(match[0].length) : source;
  if (!match) return { frontmatter: {}, body, errors: ["A skill needs a YAML frontmatter block."] };

  let parsed: unknown;
  try {
    parsed = (await import("js-yaml")).load(match[1]);
  } catch (error) {
    return { frontmatter: {}, body, errors: [`Frontmatter is not valid YAML: ${error instanceof Error ? error.message : "parse error"}`] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { frontmatter: {}, body, errors: ["Frontmatter must be a YAML mapping."] };
  }
  const frontmatter = parsed as Record<string, unknown>;
  const errors: string[] = [];
  const description = typeof frontmatter.description === "string" ? frontmatter.description.trim() : undefined;
  if (frontmatter.description !== undefined && typeof frontmatter.description !== "string") errors.push("Description must be text.");
  const toolBindings = normalizedList(frontmatter.tools, TOOLS, "tool", errors) as CompanionToolName[] | undefined;
  const projectChecks = normalizedList(frontmatter.checks, CHECKS, "check", errors) as ProjectCheckId[] | undefined;
  return { frontmatter, body, ...(description ? { description } : {}), ...(toolBindings ? { toolBindings } : {}), ...(projectChecks ? { projectChecks } : {}), errors };
}

function normalizedList(value: unknown, allowed: Set<string>, label: string, errors: string[]): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) { errors.push(`${label} bindings must be a list.`); return undefined; }
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) { errors.push(`A ${label} binding must be a non-empty name.`); continue; }
    const name = item.trim();
    if (seen.has(name)) { errors.push(`Duplicate ${label} binding: ${name}.`); continue; }
    seen.add(name);
    if (!allowed.has(name)) { errors.push(`Unknown or disallowed ${label}: ${name}.`); continue; }
    normalized.push(name);
  }
  return normalized;
}

export interface SkillDocumentDraft {
  name: string;
  description: string;
  body: string;
  toolBindings: CompanionToolName[];
  projectChecks: ProjectCheckId[];
  frontmatter?: Record<string, unknown>;
}

// Known fields are replaced; unrelated keys survive an edit.
export async function serializeSkillDocument(draft: SkillDocumentDraft): Promise<string> {
  const metadata: Record<string, unknown> = { ...(draft.frontmatter ?? {}), type: "skill", title: draft.name.trim() };
  if (draft.description.trim()) metadata.description = draft.description.trim();
  else delete metadata.description;
  if (draft.toolBindings.length) metadata.tools = [...new Set(draft.toolBindings)];
  else delete metadata.tools;
  if (draft.projectChecks.length) metadata.checks = [...new Set(draft.projectChecks)];
  else delete metadata.checks;
  const yaml = await import("js-yaml");
  const frontmatter = yaml.dump(metadata, { lineWidth: -1, noRefs: true }).trimEnd();
  return `---\n${frontmatter}\n---\n${draft.body.replace(/^\n+/, "")}`;
}
