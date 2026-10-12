// @vitest-environment node
import { describe, it, expect } from "vitest";
import { extractTasks, patchLineInContent } from "./taskExtractor";

describe("extractTasks", () => {
  it("reads the status from the box character", () => {
    const content = "- [ ] Draft\n- [/] Build\n- [!] Wait\n- [x] Ship\n- [X] Ship too\n- [-] Drop\n";
    const tasks = extractTasks("note.md", content);
    expect(tasks.map((t) => t.status)).toEqual(["todo", "prog", "hold", "done", "done", "cancelled"]);
    expect(tasks.map((t) => t.checked)).toEqual([false, false, false, true, true, false]);
  });

  it("finds plain checklist items with no metadata", () => {
    const content = "- [ ] Plain task\n- [x] Done task\n";
    const tasks = extractTasks("note.md", content);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({ checked: false, status: "todo", text: "Plain task" });
    expect(tasks[1]).toMatchObject({ checked: true, status: "done", text: "Done task" });
  });

  it("treats former status tags as plain tags that never change the status", () => {
    const content = "- [ ] Ship report #prog\n- [ ] Deploy billing #blocked\n- [x] Fix login #todo\n";
    const tasks = extractTasks("note.md", content);
    expect(tasks.map((t) => t.status)).toEqual(["todo", "todo", "done"]);
    expect(tasks.map((t) => t.tags)).toEqual([["prog"], ["blocked"], ["todo"]]);
    expect(tasks.map((t) => t.text)).toEqual(["Ship report", "Deploy billing", "Fix login"]);
  });

  it("strips a tag wrapped in parens without leaving an empty () behind", () => {
    const [task] = extractTasks("note.md", "- [ ] Deploy billing (#infra) #web\n");
    expect(task.text).toBe("Deploy billing");
    expect(task.tags).toEqual(["infra", "web"]);
  });

  it("preserves numeric ticket references in display text", () => {
    const content = "- [ ] SSO Groups page Bugfixes (#1, #2, #3)\n";
    const [task] = extractTasks("note.md", content);
    expect(task.text).toBe("SSO Groups page Bugfixes (#1, #2, #3)");
  });

  it("finds tasks regardless of heading/indentation", () => {
    const content = "# Heading\n\nSome text\n\n## Sub\n  - [ ] Nested task\n";
    const tasks = extractTasks("note.md", content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].line).toBe(5);
  });

  it("ignores non-checklist list items", () => {
    const content = "- just a bullet\n- [ ] real task\n";
    const tasks = extractTasks("note.md", content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].text).toBe("real task");
  });
});

describe("patchLineInContent", () => {
  it("flips an unchecked task to checked at the recorded line", () => {
    const content = "- [ ] Task A\n- [ ] Task B\n";
    const [, taskB] = extractTasks("note.md", content);
    const patched = patchLineInContent(content, taskB);
    expect(patched).toBe("- [ ] Task A\n- [x] Task B\n");
  });

  it("flips a checked task back to unchecked", () => {
    const content = "- [x] Done\n";
    const [task] = extractTasks("note.md", content);
    const patched = patchLineInContent(content, task);
    expect(patched).toBe("- [ ] Done\n");
  });

  it("recovers via nearby-line search when lines shifted above the task", () => {
    const content = "- [ ] Task A\n";
    const [task] = extractTasks("note.md", content);
    const driftedContent = "New line inserted\n" + content;
    const patched = patchLineInContent(driftedContent, task);
    expect(patched).toBe("New line inserted\n- [x] Task A\n");
  });

  it("completes an in-progress or on-hold task, and reopens a cancelled one", () => {
    const content = "- [/] Build\n- [!] Wait\n- [-] Drop\n";
    const [prog, hold, cancelled] = extractTasks("note.md", content);
    expect(patchLineInContent(content, prog)).toBe("- [x] Build\n- [!] Wait\n- [-] Drop\n");
    expect(patchLineInContent(content, hold)).toBe("- [/] Build\n- [x] Wait\n- [-] Drop\n");
    expect(patchLineInContent(content, cancelled)).toBe("- [/] Build\n- [!] Wait\n- [ ] Drop\n");
  });

  it("sets an explicit status", () => {
    const content = "- [ ] Task #infra\n";
    const [task] = extractTasks("note.md", content);
    expect(patchLineInContent(content, task, "prog")).toBe("- [/] Task #infra\n");
    expect(patchLineInContent(content, task, "hold")).toBe("- [!] Task #infra\n");
    expect(patchLineInContent(content, task, "cancelled")).toBe("- [-] Task #infra\n");
  });

  it("returns null when the task's line can no longer be located", () => {
    const content = "- [ ] Task A\n";
    const [task] = extractTasks("note.md", content);
    const unrelatedContent = "Completely different content\n";
    expect(patchLineInContent(unrelatedContent, task)).toBeNull();
  });
});
