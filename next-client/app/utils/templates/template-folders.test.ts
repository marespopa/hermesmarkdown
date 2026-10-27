// @vitest-environment node
import { describe, expect, it } from "vitest";
import { planScaffold } from "./folder-template";
import { BUILTIN_FOLDER_TEMPLATES } from "./template-folders";
import { packTemplatesInVault } from "./template-packs";

const project = BUILTIN_FOLDER_TEMPLATES[0];

describe("BUILTIN_FOLDER_TEMPLATES", () => {
  it("makes a scaffold whose folder is named from the Project name prompt", () => {
    const source = {
      name: project.name,
      entries: project.templates.map((t) => ({ path: `${t.name}.md`, kind: "file" as const, text: t.body })),
    };
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

  it("marks the README as a scaffold and keeps date tokens raw in Decisions", () => {
    expect(project.templates.find((t) => t.name === "README")!.body).toMatch(/^---\nscaffold: true\n---/);
    expect(project.templates.find((t) => t.name === "Decisions")!.body).toContain("{{date}}");
  });

  it("counts the files already in the vault, nested ones included", () => {
    const dir = "_templates/{{Project name}}";
    expect([...packTemplatesInVault(project, "_templates", [`${dir}/Tasks.md`, `${dir}/Meetings/Kickoff.md`])].sort())
      .toEqual(["Meetings/Kickoff", "Tasks"]);
  });
});
