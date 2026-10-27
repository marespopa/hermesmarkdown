// @vitest-environment node
import { describe, expect, it } from "vitest";
import { planScaffold } from "./folder-template";
import { builtinFolderSource, BUILTIN_FOLDER_TEMPLATES } from "./template-folders";

const project = BUILTIN_FOLDER_TEMPLATES.find((p) => p.id === "project-folder")!;

describe("BUILTIN_FOLDER_TEMPLATES", () => {
  it("makes a scaffold whose folder is named from the Project name prompt", () => {
    const source = builtinFolderSource(project);
    const plan = planScaffold(source, { now: new Date(2026, 9, 12), clipboard: "", prompts: { "Project name": "Mobile app" } });
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.topName).toBe("Mobile app");
      const readme = plan.entries.find((e) => e.path === "Mobile app/README.md");
      expect(String(readme?.content)).toContain("# Mobile app");
      expect(String(readme?.content)).not.toContain("scaffold");
      expect(plan.entries.some((e) => e.path === "Mobile app/Meetings/Kickoff.md")).toBe(true);
    }
  });

  it("reads like a folder on disk: folders before their contents, siblings by name", () => {
    expect(builtinFolderSource(project).entries.map((e) => `${e.kind}:${e.path}`)).toEqual([
      "folder:Meetings",
      "file:Meetings/Kickoff.md",
      "file:Decisions.md",
      "file:README.md",
      "file:Tasks.md",
    ]);
  });

  it("marks the README as a scaffold and keeps date tokens raw in Decisions", () => {
    expect(project.templates.find((t) => t.name === "README")!.body).toMatch(/^---\nscaffold: true\n---/);
    expect(project.templates.find((t) => t.name === "Decisions")!.body).toContain("{{date}}");
  });

  it("makes a Research folder named from its prompt, with a sources table", () => {
    const research = BUILTIN_FOLDER_TEMPLATES.find((p) => p.id === "research-folder")!;
    const plan = planScaffold(builtinFolderSource(research), { now: new Date(2026, 9, 12), clipboard: "", prompts: { "Research topic": "Pricing" } });
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.topName).toBe("Pricing");
      expect(plan.entries.map((e) => e.path)).toEqual(expect.arrayContaining(["Pricing/README.md", "Pricing/Sources.md", "Pricing/Open questions.md"]));
      expect(String(plan.entries.find((e) => e.path === "Pricing/Sources.md")?.content)).toContain("| Source | Takeaway |");
    }
  });
});
