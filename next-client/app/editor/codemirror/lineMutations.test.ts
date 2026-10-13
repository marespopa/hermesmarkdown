// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  indentSubtreeInContent,
  insertChildInContent,
  moveSubtreeInContent,
  outdentSubtreeInContent,
  setTaskStatusInContent,
  toggleTaskStatusInContent,
} from "./lineMutations";

describe("outline line mutations", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("indents and outdents a complete subtree", () => {
    const content = "- [ ] Parent\n  - [ ] Child\n- [ ] Sibling";
    const indented = indentSubtreeInContent(content, 0);

    expect(indented).toBe("    - [ ] Parent\n      - [ ] Child\n- [ ] Sibling");
    expect(outdentSubtreeInContent(indented, 0)).toBe(content);
  });

  it("outdents a two-space or tab level too", () => {
    expect(outdentSubtreeInContent("- a\n  - b", 1)).toBe("- a\n- b");
    expect(outdentSubtreeInContent("- a\n\t- b", 1)).toBe("- a\n- b");
  });

  it("cycles task state from todo to in-progress to done, stamping each step", () => {
    const todo = "- [ ] Task";
    const doing = toggleTaskStatusInContent(todo, 0);
    const done = toggleTaskStatusInContent(doing, 0);

    expect(doing).toBe("- [/] Task @started(2026-10-12)");
    expect(done).toBe("- [x] Task @started(2026-10-12) @done(2026-10-12)");
    expect(toggleTaskStatusInContent(done, 0)).toBe(todo);
  });

  it("re-enters the cycle from on hold at in progress, from cancelled at to do", () => {
    expect(toggleTaskStatusInContent("- [!] Task @started(2026-10-01)", 0)).toBe("- [/] Task @started(2026-10-01)");
    expect(toggleTaskStatusInContent("- [-] Task", 0)).toBe("- [ ] Task");
  });

  it("sets a task line to one status, leaving other lines alone", () => {
    const content = "- [ ] Task #infra\nplain text";
    expect(setTaskStatusInContent(content, 0, "hold")).toBe("- [!] Task #infra\nplain text");
    expect(setTaskStatusInContent(content, 0, "prog")).toBe("- [/] Task #infra @started(2026-10-12)\nplain text");
    expect(setTaskStatusInContent(content, 0, "cancelled")).toBe("- [-] Task #infra\nplain text");
    expect(setTaskStatusInContent(content, 1, "done")).toBe(content);
  });

  it("inserts a child using the parent's list style and indentation", () => {
    expect(insertChildInContent("* Parent\n* Sibling", 0)).toBe("* Parent\n    * [ ] \n* Sibling");
  });

  it("moves only the selected subtree among same-level siblings", () => {
    const content = "- A\n  - A child\n- B\n- C";

    expect(moveSubtreeInContent(content, 0, "down")).toBe("- B\n- A\n  - A child\n- C");
    expect(moveSubtreeInContent(content, 2, "up")).toBe("- B\n- A\n  - A child\n- C");
  });
});