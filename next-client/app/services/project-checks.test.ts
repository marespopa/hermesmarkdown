import { describe, expect, it } from "vitest";
import { COMPANION_TOOL_DEFS } from "./companion-tool-defs";
import { isProjectCheckAvailable, projectCheckById, PROJECT_CHECKS, validateProjectCheckCatalog, validateProjectCheckLimits } from "./project-checks";

describe("fixed project checks", () => {
  it("resolves only fixed check IDs and never accepts arbitrary commands", () => {
    expect(projectCheckById("typecheck")?.argv).toEqual(["corepack", "yarn", "tsc", "--noEmit"]);
    expect(projectCheckById("echo hello")).toBeNull();
    expect(projectCheckById("../../escape")).toBeNull();
    expect(COMPANION_TOOL_DEFS.run_project_check.inputSchema.safeParse({ checkId: "typecheck", command: "custom" }).success).toBe(false);
  });
  it("rejects shell syntax, path escape, duplicate IDs and invalid timeout or output limits", () => {
    expect(validateProjectCheckCatalog([{ ...PROJECT_CHECKS[0], argv: ["corepack", "yarn; touch bad"] }])).toContain("typecheck: argv is empty or contains shell syntax.");
    expect(validateProjectCheckCatalog([{ ...PROJECT_CHECKS[0], argv: ["../outside"] }])).toContain("typecheck: argv is empty or contains shell syntax.");
    expect(validateProjectCheckCatalog([{ ...PROJECT_CHECKS[0], timeoutMs: 120001 }])).toContain("typecheck: timeout is outside the allowed limit.");
    expect(validateProjectCheckLimits({ timeoutMs: 120001 })).toBe(false);
    expect(validateProjectCheckLimits({ timeoutMs: 1000, outputChars: 32001 })).toBe(false);
    expect(validateProjectCheckLimits({ timeoutMs: 1000, lineChars: 2001 })).toBe(false);
    expect(validateProjectCheckCatalog([PROJECT_CHECKS[0], PROJECT_CHECKS[0]])).toContain("Check IDs must be unique strings.");
  });
  it("gates helper execution by vault kind, platform and pairing", () => {
    expect(isProjectCheckAvailable({ hasVault: false, browserVault: false, mobile: false, paired: true }).available).toBe(false);
    expect(isProjectCheckAvailable({ hasVault: true, browserVault: true, mobile: false, paired: true }).reason).toContain("check_file");
    expect(isProjectCheckAvailable({ hasVault: true, browserVault: false, mobile: true, paired: true }).reason).toContain("mobile");
    expect(isProjectCheckAvailable({ hasVault: true, browserVault: false, mobile: false, paired: false }).reason).toContain("Pair");
    expect(isProjectCheckAvailable({ hasVault: true, browserVault: false, mobile: false, paired: true }).available).toBe(true);
  });
});
