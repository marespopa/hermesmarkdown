// app/utils/queryEngine.ts
import { FileMetadata } from "../atoms/metadata";

export type QueryOperator = "AND" | "OR";

export interface QueryRule {
  field: string;
  condition:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "starts_with"
    | "ends_with"
    | "includes"
    | "not_includes"
    | "before"
    | "after"
    | "before-days"
    | "after-days"
    | "exists"
    | "not_exists"
    | "greater_than"
    | "less_than"
    | "between";
  value: any;
}

export interface WorkspaceQuery {
  operator: QueryOperator;
  rules: QueryRule[];
}

/**
 * Normalizes a field value into a lowercase string list. `file.tags` is a
 * real array; frontmatter list fields (e.g. `related`) are stored as
 * comma-separated strings, matching the rest of the app's frontmatter
 * convention (see frontmatter-utils.ts).
 */
function toList(fieldValue: any): string[] {
  const items = Array.isArray(fieldValue)
    ? fieldValue
    : String(fieldValue ?? "").split(",");
  return items.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
}

/**
 * Evaluates a file against a set of rules.
 */
export const evaluateQuery = (
  file: FileMetadata,
  query: WorkspaceQuery,
  allMetadata: Record<string, FileMetadata> = {},
): boolean => {
  const evaluator = (rule: QueryRule): boolean => {
    let fieldValue: any;

    if (rule.field === "tags") {
      fieldValue = file.tags;
    } else if (rule.field === "modifiedAt") {
      fieldValue = file.modifiedAt;
    } else if (rule.field === "wordCount") {
      fieldValue = file.wordCount;
    } else if (rule.field === "backlinks") {
      // Calculate backlinks dynamically
      // A backlink exists if another file's 'links' array contains this file's name (without .md)
      const fileName = file.name.replace(".md", "");
      fieldValue = Object.values(allMetadata).filter((m) =>
        m.links.some(
          (l) =>
            l === fileName ||
            l === file.name ||
            l === file.path ||
            l === `./${file.name}`,
        ),
      ).length;
    } else if (rule.field.startsWith("frontmatter.")) {
      const key = rule.field.replace("frontmatter.", "");
      fieldValue = file.frontmatter?.[key];
    } else if (rule.field === "name") {
      fieldValue = file.name;
    } else {
      return false;
    }

    switch (rule.condition) {
      case "equals":
        return fieldValue === rule.value;
      case "not_equals":
        return fieldValue !== rule.value;
      case "contains":
        return String(fieldValue)
          .toLowerCase()
          .includes(String(rule.value).toLowerCase());
      case "not_contains":
        return !String(fieldValue)
          .toLowerCase()
          .includes(String(rule.value).toLowerCase());
      case "starts_with":
        return String(fieldValue)
          .toLowerCase()
          .startsWith(String(rule.value).toLowerCase());
      case "ends_with":
        return String(fieldValue)
          .toLowerCase()
          .endsWith(String(rule.value).toLowerCase());
      case "includes":
        return toList(fieldValue).includes(String(rule.value).toLowerCase());
      case "not_includes":
        return !toList(fieldValue).includes(String(rule.value).toLowerCase());
      case "before":
        return Number(fieldValue) < Number(rule.value);
      case "after":
        return Number(fieldValue) > Number(rule.value);
      case "before-days": {
        const boundary = Date.now() - Number(rule.value) * 24 * 60 * 60 * 1000;
        return Number(fieldValue) < boundary;
      }
      case "after-days": {
        const boundary = Date.now() - Number(rule.value) * 24 * 60 * 60 * 1000;
        return Number(fieldValue) > boundary;
      }
      case "exists":
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== "";
      case "not_exists":
        return fieldValue === undefined || fieldValue === null || fieldValue === "";
      case "greater_than":
        return Number(fieldValue) > Number(rule.value);
      case "less_than":
        return Number(fieldValue) < Number(rule.value);
      case "between": {
        if (typeof rule.value === "string" && rule.value.includes(",")) {
          const [min, max] = rule.value.split(",").map(Number);
          return Number(fieldValue) >= min && Number(fieldValue) <= max;
        }
        return false;
      }
      default:
        return false;
    }
  };

  if (query.rules.length === 0) return true;

  return query.operator === "AND"
    ? query.rules.every(evaluator)
    : query.rules.some(evaluator);
};
