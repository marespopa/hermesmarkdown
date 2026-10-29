import catalog from "./project-check-catalog.json";

export type ProjectCheckId = "typecheck" | "unit-tests";
export interface ProjectCheckDefinition {
  id: ProjectCheckId;
  label: string;
  argv: readonly string[];
  cwd: "vault" | "project";
  timeoutMs: number;
}

export const PROJECT_CHECKS = catalog as unknown as readonly ProjectCheckDefinition[];
export const PROJECT_CHECK_IDS = PROJECT_CHECKS.map(({ id }) => id) as [ProjectCheckId, ...ProjectCheckId[]];
export const PROJECT_CHECK_TIMEOUT_MS = 120_000;
export const PROJECT_CHECK_MAX_OUTPUT_CHARS = 32_000;
export const PROJECT_CHECK_MAX_LINE_CHARS = 2_000;
const SHELL_SYNTAX = /[;&|<>`$(){}\\\n\r]/;

export function projectCheckById(id: unknown): ProjectCheckDefinition | null {
  return typeof id === "string" ? PROJECT_CHECKS.find((check) => check.id === id) ?? null : null;
}

export function validateProjectCheckCatalog(checks: readonly ProjectCheckDefinition[] = PROJECT_CHECKS): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const check of checks) {
    if (!check || typeof check.id !== "string" || ids.has(check.id)) problems.push("Check IDs must be unique strings.");
    ids.add(check.id);
    if (!Array.isArray(check.argv) || !check.argv.length || check.argv.some((part) => !part || SHELL_SYNTAX.test(part) || part.includes("..") || part.startsWith("/") || /^[A-Za-z]:/.test(part))) {
      problems.push(`${check.id}: argv is empty or contains shell syntax.`);
    }
    if (check.cwd !== "project" && check.cwd !== "vault") problems.push(`${check.id}: cwd is not allowed.`);
    if (!Number.isInteger(check.timeoutMs) || check.timeoutMs < 1 || check.timeoutMs > PROJECT_CHECK_TIMEOUT_MS) {
      problems.push(`${check.id}: timeout is outside the allowed limit.`);
    }
  }
  return problems;
}

export function validateProjectCheckLimits({ timeoutMs, outputChars = PROJECT_CHECK_MAX_OUTPUT_CHARS, lineChars = PROJECT_CHECK_MAX_LINE_CHARS }: { timeoutMs: number; outputChars?: number; lineChars?: number }): boolean {
  return Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= PROJECT_CHECK_TIMEOUT_MS
    && Number.isInteger(outputChars) && outputChars > 0 && outputChars <= PROJECT_CHECK_MAX_OUTPUT_CHARS
    && Number.isInteger(lineChars) && lineChars > 0 && lineChars <= PROJECT_CHECK_MAX_LINE_CHARS;
}

export function isProjectCheckAvailable({ hasVault, browserVault, mobile, paired }: {
  hasVault: boolean;
  browserVault: boolean;
  mobile: boolean;
  paired: boolean;
}): { available: boolean; reason?: string } {
  if (!hasVault) return { available: false, reason: "Open a disk vault to use local project checks." };
  if (browserVault) return { available: false, reason: "Project checks need a local project folder; browser vaults cannot run local tools. Use check_file for syntax checks." };
  if (mobile) return { available: false, reason: "Project checks are unavailable on mobile. Use check_file for syntax checks." };
  if (!paired) return { available: false, reason: "Pair the local helper in Settings → AI Features before running a project check." };
  return { available: true };
}
