// @vitest-environment node
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { extractTasks, patchLineInContent, replaceTaskLine, simpleHash } from "./taskExtractor";

describe("extractTasks in fenced code", () => {
  it("ignores tasks inside ``` and ~~~ fences, any language, indented too", () => {
    const content = "```md\n- [ ] a\n```\n~~~\n- [ ] b\n~~~\n  ```js\n- [ ] c\n  ```\n- [ ] real\n";
    expect(extractTasks("n.md", content).map((t) => t.text)).toEqual(["real"]);
  });

  it("keeps line numbers for tasks after a fence", () => {
    const [task] = extractTasks("n.md", "```\nx\n```\n- [ ] after\n");
    expect(task.line).toBe(3);
    expect(task.id).toBe("n.md#3");
  });

  it("lets an unclosed fence hide the rest", () => {
    expect(extractTasks("n.md", "- [ ] before\n```\n- [ ] hidden\n")).toHaveLength(1);
  });

  it("closes a fence with a longer run but not a shorter or different one", () => {
    expect(extractTasks("n.md", "```\n- [ ] a\n````\n- [ ] b\n").map((t) => t.text)).toEqual(["b"]);
    expect(extractTasks("n.md", "````\n- [ ] a\n```\n- [ ] b\n~~~~\n").map((t) => t.text)).toEqual([]);
  });

  it("yields only the prose task from a board file", () => {
    const content = '---\nhermes: board\n---\n\n- [ ] prose\n\n```hermes-board\n{"text":"- [ ] json"}\n- [ ] inside\n```\n';
    expect(extractTasks("b.board.md", content).map((t) => t.text)).toEqual(["prose"]);
  });
});

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

  it("reads @started and @done stamps and strips them from the text", () => {
    const [task] = extractTasks("note.md", "- [x] Ship report @started(2026-10-08) @done(2026-10-12) #infra\n");
    expect(task).toMatchObject({ startedDate: "2026-10-08", doneDate: "2026-10-12", text: "Ship report", tags: ["infra"] });
    const [plain] = extractTasks("note.md", "- [ ] Draft\n");
    expect(plain).toMatchObject({ startedDate: null, doneDate: null });
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
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("flips an unchecked task to checked at the recorded line", () => {
    const content = "- [ ] Task A\n- [ ] Task B\n";
    const [, taskB] = extractTasks("note.md", content);
    const patched = patchLineInContent(content, taskB);
    expect(patched).toBe("- [ ] Task A\n- [x] Task B @done(2026-10-12)\n");
  });

  it("flips a checked task back to unchecked", () => {
    const content = "- [x] Done @done(2026-10-09)\n";
    const [task] = extractTasks("note.md", content);
    const patched = patchLineInContent(content, task);
    expect(patched).toBe("- [ ] Done\n");
  });

  it("recovers via nearby-line search when lines shifted above the task", () => {
    const content = "- [ ] Task A\n";
    const [task] = extractTasks("note.md", content);
    const driftedContent = "New line inserted\n" + content;
    const patched = patchLineInContent(driftedContent, task);
    expect(patched).toBe("New line inserted\n- [x] Task A @done(2026-10-12)\n");
  });

  it("completes an in-progress or on-hold task, and reopens a cancelled one", () => {
    const content = "- [/] Build\n- [!] Wait\n- [-] Drop\n";
    const [prog, hold, cancelled] = extractTasks("note.md", content);
    expect(patchLineInContent(content, prog)).toBe("- [x] Build @done(2026-10-12)\n- [!] Wait\n- [-] Drop\n");
    expect(patchLineInContent(content, hold)).toBe("- [/] Build\n- [x] Wait @done(2026-10-12)\n- [-] Drop\n");
    expect(patchLineInContent(content, cancelled)).toBe("- [/] Build\n- [!] Wait\n- [ ] Drop\n");
  });

  it("sets an explicit status", () => {
    const content = "- [ ] Task #infra\n";
    const [task] = extractTasks("note.md", content);
    expect(patchLineInContent(content, task, "prog")).toBe("- [/] Task #infra @started(2026-10-12)\n");
    expect(patchLineInContent(content, task, "hold")).toBe("- [!] Task #infra\n");
    expect(patchLineInContent(content, task, "cancelled")).toBe("- [-] Task #infra\n");
  });

  it("replaceTaskLine finds a line by its exact text and reports what changed", () => {
    const after = "- [x] Ship @done(2026-10-12)";
    const content = `# Log\n${after}\n`;
    const result = replaceTaskLine(content, { line: 1, raw: after, lineHash: simpleHash(after) }, () => "- [ ] Ship");
    expect(result).toEqual({ content: "# Log\n- [ ] Ship\n", line: 1, before: after, after: "- [ ] Ship" });
    expect(replaceTaskLine(content, { line: 1, raw: "- [ ] Other", lineHash: simpleHash("- [ ] Other") }, () => "x")).toBeNull();
  });

  it("returns null when the task's line can no longer be located", () => {
    const content = "- [ ] Task A\n";
    const [task] = extractTasks("note.md", content);
    const unrelatedContent = "Completely different content\n";
    expect(patchLineInContent(unrelatedContent, task)).toBeNull();
  });
});
