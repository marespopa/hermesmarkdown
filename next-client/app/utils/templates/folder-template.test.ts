import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  expandNameSegment,
  folderTemplateDisplayName,
  planScaffold,
  scaffoldPromptLabels,
  scaffoldUsesClipboard,
  type ScaffoldSource,
} from "./folder-template";

const NOW = new Date(2026, 9, 27, 10, 30);
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => vi.useRealTimers());

const ctx = (prompts: Record<string, string> = {}) => ({ now: NOW, clipboard: "", prompts });
const file = (path: string, text: string) => ({ path, kind: "file" as const, text });
const folder = (path: string) => ({ path, kind: "folder" as const });
const source = (name: string, entries: ScaffoldSource["entries"]): ScaffoldSource => ({ name, entries });
const ok = (plan: ReturnType<typeof planScaffold>) => {
  if (!plan.ok) throw new Error(`plan failed: ${plan.reason}`);
  return plan;
};

describe("scaffoldPromptLabels", () => {
  it("orders top name, then names, then bodies, each once", () => {
    const labels = scaffoldPromptLabels(source("{{prompt:Client}} launch", [
      folder("{{prompt:Phase}}"),
      file("{{prompt:Phase}}/{{prompt:Owner team}}.md", "{{prompt:Budget}} {{prompt:Client}}"),
      file("README.md", "{{prompt:Goal}}"),
    ]));
    expect(labels).toEqual(["Client", "Phase", "Owner team", "Budget", "Goal"]);
  });

  it("asks once when a name's {{Label}} and a body's {{prompt:Label}} match", () => {
    const labels = scaffoldPromptLabels(source("{{Project name}}", [file("README.md", "# {{prompt:Project name}} {{prompt:Goal}}")]));
    expect(labels).toEqual(["Project name", "Goal"]);
  });

  it("reads the clipboard only when a body uses it", () => {
    expect(scaffoldUsesClipboard(source("A", [file("a.md", "{{clipboard}}")]))).toBe(true);
    expect(scaffoldUsesClipboard(source("A", [file("{{clipboard}}.md", "x")]))).toBe(false);
  });
});

describe("expandNameSegment", () => {
  it("expands prompts and dates", () => {
    expect(expandNameSegment("{{prompt:Client}} {{date:YYYY-MM}}", ctx({ Client: "Acme" }))).toBe("Acme 2026-10");
    expect(expandNameSegment("{{date+1d}}", ctx())).toBe("2026-10-28");
  });

  it("asks for any other text in braces, so names need no colon", () => {
    expect(expandNameSegment("{{Project name}} {{year}}", ctx({ "Project name": "Acme launch" }))).toBe("Acme launch 2026");
  });

  it("leaves tokens that don't belong in a name as typed", () => {
    expect(expandNameSegment("{{title}} {{cursor}}", ctx())).toBe("{{title}} {{cursor}}");
  });

  it("makes forbidden characters safe and strips leading dots", () => {
    expect(expandNameSegment("{{time}}", ctx())).toBe("10-30");
    expect(expandNameSegment("{{prompt:A}}", ctx({ A: "a/b" }))).toBe("a-b");
    expect(expandNameSegment("..hidden", ctx())).toBe("hidden");
  });
});

describe("folderTemplateDisplayName", () => {
  it("shows prompt labels and fills in the other tokens", () => {
    expect(folderTemplateDisplayName("{{date:YYYY}} {{prompt:Client}} engagement", NOW)).toBe("2026 Client engagement");
    expect(folderTemplateDisplayName("{{Project name}}", NOW)).toBe("Project name");
  });
});

describe("planScaffold", () => {
  it("stops on a name that expands to empty", () => {
    const empty = planScaffold(source("Launch", [folder("{{prompt:Name}}")]), ctx({ Name: "  " }));
    expect(empty).toMatchObject({ ok: false, reason: "empty-name", sourcePath: "{{prompt:Name}}" });
  });

  it("stops on targets that match after expansion, and ignoring case", () => {
    const dup = planScaffold(source("Launch", [file("{{date}}.md", "a"), file("2026-10-27.md", "b")]), ctx());
    expect(dup).toMatchObject({ ok: false, reason: "duplicate", targetPath: "Launch/2026-10-27.md" });
    const cased = planScaffold(source("Launch", [file("Plan.md", "a"), file("plan.md", "b")]), ctx());
    expect(cased).toMatchObject({ ok: false, reason: "duplicate" });
  });

  it("uses the file name as {{title}}, and the folder's name in a README", () => {
    const plan = ok(planScaffold(source("{{prompt:Client}} launch", [
      folder("Notes"),
      file("Notes/README.md", "# {{title}}"),
      file("Notes/Kickoff.md", "# {{title}}"),
      file("README.md", "# {{title}}"),
    ]), ctx({ Client: "Acme" })));
    const content = (path: string) => plan.entries.find((e) => e.path === path)?.content;
    expect(content("Acme launch/Notes/README.md")).toBe("# Notes");
    expect(content("Acme launch/Notes/Kickoff.md")).toBe("# Kickoff");
    expect(content("Acme launch/README.md")).toBe("# Acme launch");
  });

  it("removes scaffold from the root README, and drops the block when it was alone", () => {
    const kept = ok(planScaffold(source("A", [file("README.md", "---\nscaffold: true\nstatus: draft\n---\nBody")]), ctx()));
    expect(kept.entries[1].content).toBe("---\nstatus: draft\n---\nBody");
    const dropped = ok(planScaffold(source("A", [file("README.md", "---\nscaffold: true\n---\nBody")]), ctx()));
    expect(dropped.entries[1].content).toBe("Body");
  });

  it("leaves out a README that only had the marker", () => {
    const plan = ok(planScaffold(source("A", [file("README.md", "---\nscaffold: true\n---\n")]), ctx()));
    expect(plan.entries.map((e) => e.path)).toEqual(["A"]);
    expect(plan.noteCount).toBe(0);
  });

  it("passes binary files through and creates empty folders", () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const plan = ok(planScaffold(source("A", [
      folder("assets"),
      { path: "assets/{{prompt:N}}.png", kind: "file", bytes },
      folder("empty"),
    ]), ctx({ N: "logo" })));
    expect(plan.entries.find((e) => e.path === "A/assets/logo.png")?.content).toBe(bytes);
    expect(plan.entries.find((e) => e.path === "A/empty")).toEqual({ path: "A/empty", kind: "folder" });
    expect(plan.noteCount).toBe(0);
  });

  it("keeps the cursor only on the root README, and counts written notes", () => {
    const plan = ok(planScaffold(source("A", [
      file("Plan.md", "x{{cursor}}"),
      file("README.md", "Hi {{cursor}}there"),
    ]), ctx()));
    const root = plan.entries.find((e) => e.isRootReadme)!;
    expect(root).toMatchObject({ content: "Hi there", cursor: 3 });
    expect(plan.entries.find((e) => e.path === "A/Plan.md")).toMatchObject({ content: "x" });
    expect(plan.entries.find((e) => e.path === "A/Plan.md")?.cursor).toBeUndefined();
    expect(plan.noteCount).toBe(2);
  });

  it("writes an empty note as a newline", () => {
    const plan = ok(planScaffold(source("A", [file("Empty.md", "")]), ctx()));
    expect(plan.entries[1].content).toBe("\n");
  });
});
