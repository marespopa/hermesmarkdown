import { describe, it, expect } from "vitest";
import { extractTasks, patchLineInContent } from "./taskExtractor";

describe("extractTasks", () => {
  it("finds plain checklist items with no metadata", () => {
    const content = "- [ ] Plain task\n- [x] Done task\n";
    const tasks = extractTasks("note.md", content);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({ checked: false, inProgress: false, text: "Plain task" });
    expect(tasks[1]).toMatchObject({ checked: true, inProgress: false, text: "Done task" });
  });

  it("parses inline #prog metadata and strips it from display text", () => {
    const content = "- [ ] Ship report #prog\n";
    const [task] = extractTasks("note.md", content);
    expect(task.inProgress).toBe(true);
    expect(task.text).toBe("Ship report");
  });

  it("does not mark a checked task as in progress even if tagged #prog", () => {
    const content = "- [x] Ship report #prog\n";
    const [task] = extractTasks("note.md", content);
    expect(task.inProgress).toBe(false);
  });

  it("strips #todo and #done tags from display text too, not just #prog", () => {
    const content = "- [ ] Ship report #todo\n- [x] Ship report #done\n";
    const tasks = extractTasks("note.md", content);
    expect(tasks[0].text).toBe("Ship report");
    expect(tasks[1].text).toBe("Ship report");
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

  it("returns null when the task's line can no longer be located", () => {
    const content = "- [ ] Task A\n";
    const [task] = extractTasks("note.md", content);
    const unrelatedContent = "Completely different content\n";
    expect(patchLineInContent(unrelatedContent, task)).toBeNull();
  });
});
