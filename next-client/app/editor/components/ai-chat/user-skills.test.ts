import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { isUserSkill, isUserSkillActive, readUserSkill, skillCommandFor, userSkillsFrom } from "./user-skills";

const meta = (path: string, extra: Partial<FileMetadata> = {}) =>
  ({ path, name: path.split("/").pop()!, tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [], handle: {} as never, ...extra }) as FileMetadata;

describe("user skills", () => {
  it("names a skill's command after its file", () => {
    expect(skillCommandFor("skills/Standup notes.md")).toBe("/standup-notes");
    expect(skillCommandFor("release-check.md")).toBe("/release-check");
  });

  it("finds notes of type skill, from frontmatter or a type tag, leaving out taken commands", () => {
    const skills = userSkillsFrom({
      "skills/standup.md": meta("skills/standup.md", { frontmatter: { type: "skill", description: " Write today's standup " } }),
      "release-check.md": meta("release-check.md", { tags: ["type/skill"] }),
      "template.md": meta("template.md", { frontmatter: { type: "skill" } }),
      "roadmap.md": meta("roadmap.md", { frontmatter: { type: "project" } }),
    }, ["/template", "/tasks"]);
    expect(isUserSkill(meta("is-skill.md", { frontmatter: { type: "skill" } }))).toBe(true);
    expect(skills).toEqual([
      { path: "release-check.md", command: "/release-check" },
      { path: "skills/standup.md", command: "/standup", description: "Write today's standup" },
    ]);
  });

  it("keeps the first duplicate command and reports invalid bindings", () => {
    const skills = userSkillsFrom({
      "a/review.md": meta("a/review.md", { frontmatter: { type: "skill", tools: ["read_file", "read_file", "edit_file", 4], checks: ["unknown"] } }),
      "b/review.md": meta("b/review.md", { frontmatter: { type: "skill" } }),
    }, []);
    expect(skills).toHaveLength(1);
    expect(skills[0].path).toBe("a/review.md");
    expect(skills[0].toolBindings).toEqual(["read_file"]);
    expect(skills[0].validationWarnings).toEqual(expect.arrayContaining(["Duplicate tool binding: read_file.", "Unknown or disallowed tool: edit_file.", "Malformed tool binding.", "Unknown or disallowed check: unknown."]));
  });

  it("allows a skill to bind the dedicated plan creator", () => {
    const skills = userSkillsFrom({
      "skills/plan.md": meta("skills/plan.md", { frontmatter: { type: "skill", tools: ["create_plan"] } }),
    }, []);

    expect(skills).toEqual([{ path: "skills/plan.md", command: "/plan", toolBindings: ["create_plan"] }]);
  });

  it("turns on only for a message starting with the command as a word", () => {
    const skill = { path: "skills/standup.md", command: "/standup" };
    expect(isUserSkillActive(skill, "  /Standup for today")).toBe(true);
    expect(isUserSkillActive(skill, "/standup")).toBe(true);
    expect(isUserSkillActive(skill, "/standups please")).toBe(false);
    expect(isUserSkillActive(skill, "run /standup")).toBe(false);
  });

  it("reads the note's text after its frontmatter, and nothing for an empty or missing note", async () => {
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("skills/standup.md", "---\ntype: skill\n---\nList what changed since yesterday.\n");
    await vault.writeText("skills/empty.md", "---\ntype: skill\n---\n");
    expect(await readUserSkill(vault.asHandle(), "skills/standup.md")).toBe("List what changed since yesterday.");
    expect(await readUserSkill(vault.asHandle(), "skills/empty.md")).toBeNull();
    expect(await readUserSkill(vault.asHandle(), "skills/gone.md")).toBeNull();
  });
});
