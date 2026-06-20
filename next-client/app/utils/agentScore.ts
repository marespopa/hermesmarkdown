// Agent-readability scoring: frontmatter completeness, heading continuity,
// and syntax hygiene (typed fences, hyphen bullets, bold, tables).
// Extracted from StatusBar.tsx so the health detail panel can reuse the
// same itemized checks the status bar score is built from.

export type ScoreCategory = "Frontmatter" | "Headings" | "Syntax";

export type ScoreCheck = {
  id: string;
  category: ScoreCategory;
  passed: boolean;
  points: number;
  maxPoints: number;
  reason: string;
  /** Set when missing this check can be fixed via the frontmatter wizard. */
  fixField?: string;
  /** True when the check doesn't apply to this file (e.g. no code fences present) — neither a pass nor a failure. */
  na?: boolean;
};

export type AgentRating = {
  score: number;
  label: string;
  colorClass: string;
  tips: string[];
  breakdown: { label: ScoreCategory; score: number; max: number }[];
  checks: ScoreCheck[];
};

export function computeAgentScore(content: string): AgentRating {
  if (!content.trim()) {
    return { score: 0, label: "Empty", colorClass: "text-stone dark:text-fg-faint", tips: [], breakdown: [], checks: [] };
  }

  const checks: ScoreCheck[] = [];

  // ── Frontmatter (40 pts) ─────────────────────────────────────────────────

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const fm = fmMatch ? fmMatch[1] : "";

  checks.push({
    id: "fm-block", category: "Frontmatter", points: fmMatch ? 10 : 0, maxPoints: 10,
    passed: !!fmMatch,
    reason: fmMatch ? "Has a frontmatter block" : "Add a frontmatter block (--- ... ---) at the top of the file",
    fixField: "title",
  });

  const hasTitle = /^title:\s*.+/m.test(fm);
  checks.push({
    id: "fm-title", category: "Frontmatter", points: hasTitle ? 5 : 0, maxPoints: 5,
    passed: hasTitle, reason: hasTitle ? "Has `title:`" : "Add `title:` to frontmatter", fixField: "title",
  });

  const hasStatus = /^status:\s*.+/m.test(fm);
  checks.push({
    id: "fm-status", category: "Frontmatter", points: hasStatus ? 8 : 0, maxPoints: 8,
    passed: hasStatus, reason: hasStatus ? "Has `status:`" : "Add `status:` to frontmatter (e.g. draft, active)", fixField: "status",
  });

  const hasTags = /^tags:\s*\[.+\]/m.test(fm);
  checks.push({
    id: "fm-tags", category: "Frontmatter", points: hasTags ? 7 : 0, maxPoints: 7,
    passed: hasTags, reason: hasTags ? "Has `tags:`" : "Use explicit inline array for tags: `tags: [tag1, tag2]`", fixField: "tags",
  });

  const hasScope = /^scope:\s*".+"|^scope:\s*[|>]/m.test(fm);
  checks.push({
    id: "fm-scope", category: "Frontmatter", points: hasScope ? 3 : 0, maxPoints: 3,
    passed: hasScope, reason: hasScope ? "Has `scope:`" : "Add `scope:` — one paragraph describing what this file covers", fixField: "scope",
  });

  const hasReadWhen = /^read_when:\s*\[.+\]|^read_when:\n\s+-/m.test(fm);
  checks.push({
    id: "fm-read-when", category: "Frontmatter", points: hasReadWhen ? 7 : 0, maxPoints: 7,
    passed: hasReadWhen,
    reason: hasReadWhen ? "Has `read_when:`" : "Add `read_when:` — list the tasks or contexts where an agent should load this file",
    fixField: "read_when",
  });

  // ── Heading structure (30 pts) ───────────────────────────────────────────

  const headingLines = content.match(/^#{1,6} .+/gm) ?? [];

  const hasAnyHeading = headingLines.length >= 1;
  checks.push({
    id: "heading-min", category: "Headings", points: hasAnyHeading ? 8 : 0, maxPoints: 8,
    passed: hasAnyHeading, reason: hasAnyHeading ? "Has at least one heading" : "Add at least one heading",
  });

  const hasEnoughHeadings = headingLines.length >= 3;
  checks.push({
    id: "heading-count", category: "Headings", points: hasEnoughHeadings ? 7 : 0, maxPoints: 7,
    passed: hasEnoughHeadings, reason: hasEnoughHeadings ? "Has 3+ headings" : "Add more headings to structure the document (3+)",
  });

  const levels = (content.match(/^(#{1,6}) /gm) ?? []).map((h) => h.trim().length);
  const hasSkip = levels.some((l, i) => i > 0 && l - levels[i - 1] > 1);
  const hierarchyOk = !hasSkip && levels.length > 0;
  checks.push({
    id: "heading-hierarchy", category: "Headings", points: hierarchyOk ? 8 : 0, maxPoints: 8,
    passed: hierarchyOk,
    reason: levels.length === 0
      ? "No headings to evaluate hierarchy"
      : hasSkip
        ? "Fix heading hierarchy — don't skip levels (e.g. `#` → `###`)"
        : "Heading hierarchy is consistent",
  });

  const headingNames = headingLines.map((h) => h.replace(/^#{1,6} /, "").toLowerCase().trim());
  const headingsUnique = headingNames.length === new Set(headingNames).size;
  const uniqueOk = headingsUnique && headingNames.length > 0;
  checks.push({
    id: "heading-unique", category: "Headings", points: uniqueOk ? 7 : 0, maxPoints: 7,
    passed: uniqueOk,
    reason: headingNames.length === 0
      ? "No headings to check for uniqueness"
      : headingsUnique
        ? "Heading names are unique"
        : "Heading names must be unique within the file",
  });

  // ── Syntax hygiene (30 pts) ──────────────────────────────────────────────

  const totalFences = (content.match(/^```/gm) ?? []).length;
  const expectedOpeningFences = Math.ceil(totalFences / 2);
  const typedFences = (content.match(/^```[a-zA-Z]/gm) ?? []).length;
  const hasBareBlocks = typedFences < expectedOpeningFences;

  if (totalFences === 0) {
    checks.push({
      id: "syntax-typed-fences", category: "Syntax", points: 0, maxPoints: 10,
      passed: true, na: true, reason: "No code fences in this file",
    });
  } else {
    const typedOk = typedFences > 0;
    checks.push({
      id: "syntax-typed-fences", category: "Syntax", points: typedOk ? 10 : 0, maxPoints: 10,
      passed: typedOk, reason: typedOk ? "Code fences have language tags" : "Add language tags to all code fences (e.g. ` ```typescript `)",
    });
  }

  checks.push({
    id: "syntax-bare-blocks", category: "Syntax", points: !hasBareBlocks ? 5 : 0, maxPoints: 5,
    passed: !hasBareBlocks,
    reason: !hasBareBlocks ? "No bare fences without a language tag" : "Remove bare ` ``` ` blocks — every fence needs a language tag",
  });

  const hasHyphenBullets = /^- /m.test(content);
  const hasAsteriskBullets = /^\* /m.test(content);
  if (!hasHyphenBullets && !hasAsteriskBullets) {
    checks.push({
      id: "syntax-bullets", category: "Syntax", points: 0, maxPoints: 5,
      passed: true, na: true, reason: "No bullet lists in this file",
    });
  } else {
    const bulletsOk = hasHyphenBullets && !hasAsteriskBullets;
    checks.push({
      id: "syntax-bullets", category: "Syntax", points: bulletsOk ? 5 : 0, maxPoints: 5,
      passed: bulletsOk, reason: bulletsOk ? "Uses `-` for bullets" : "Use `-` for bullets instead of `*` (asterisks collide with bold syntax)",
    });
  }

  const hasTable = /^\|.+\|/m.test(content);
  checks.push({
    id: "syntax-table", category: "Syntax", points: hasTable ? 5 : 0, maxPoints: 5,
    passed: hasTable, reason: hasTable ? "Has a table" : "Add a summary table for structured data or checklists",
  });

  const hasBold = /\*\*[^*]+\*\*/.test(content);
  checks.push({
    id: "syntax-bold", category: "Syntax", points: hasBold ? 5 : 0, maxPoints: 5,
    passed: hasBold, reason: hasBold ? "Uses **bold** for emphasis" : "Use **bold** to mark critical rules or invariants for agent attention",
  });

  // ── Rating ────────────────────────────────────────────────────────────────

  const score = Math.min(100, checks.reduce((sum, c) => sum + c.points, 0));
  const tips = checks.filter((c) => !c.passed && !c.na).map((c) => c.reason);

  const breakdown: { label: ScoreCategory; score: number; max: number }[] = (
    ["Frontmatter", "Headings", "Syntax"] as ScoreCategory[]
  ).map((category) => {
    const categoryChecks = checks.filter((c) => c.category === category);
    return {
      label: category,
      score: categoryChecks.reduce((sum, c) => sum + c.points, 0),
      max: categoryChecks.reduce((sum, c) => sum + c.maxPoints, 0),
    };
  });

  if (score >= 75) return { score, label: "Structured", colorClass: "text-emerald-600 dark:text-emerald-400", tips, breakdown, checks };
  if (score >= 50) return { score, label: "Good", colorClass: "text-sage dark:text-sage", tips, breakdown, checks };
  if (score >= 25) return { score, label: "Fair", colorClass: "text-amber-500 dark:text-amber-400", tips, breakdown, checks };
  return { score, label: "Weak", colorClass: "text-stone", tips, breakdown, checks };
}
