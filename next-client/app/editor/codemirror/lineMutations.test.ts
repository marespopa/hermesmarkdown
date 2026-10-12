// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  indentSubtreeInContent,
  insertChildInContent,
  moveSubtreeInContent,
  outdentSubtreeInContent,
  setTaskStatusInContent,
  toggleTaskStatusInContent,
} from "./lineMutations";

describe("outline line mutations", () => {
  it("indents and outdents a complete subtree", () => {
    const content = "- [ ] Parent\n  - [ ] Child\n- [ ] Sibling";
    const indented = indentSubtreeInContent(content, 0);

    expect(indented).toBe("  - [ ] Parent\n    - [ ] Child\n- [ ] Sibling");
    expect(outdentSubtreeInContent(indented, 0)).toBe(content);
  });

  it("cycles task state from todo to in-progress to done", () => {
    const todo = "- [ ] Task";
    const doing = toggleTaskStatusInContent(todo, 0);
    const done = toggleTaskStatusInContent(doing, 0);

    expect(doing).toBe("- [/] Task");
    expect(done).toBe("- [x] Task");
    expect(toggleTaskStatusInContent(done, 0)).toBe(todo);
  });

  it("re-enters the cycle from on hold at in progress, from cancelled at to do", () => {
    expect(toggleTaskStatusInContent("- [!] Task", 0)).toBe("- [/] Task");
    expect(toggleTaskStatusInContent("- [-] Task", 0)).toBe("- [ ] Task");
  });

  it("sets a task line to one status, leaving other lines alone", () => {
    const content = "- [ ] Task #infra\nplain text";
    expect(setTaskStatusInContent(content, 0, "hold")).toBe("- [!] Task #infra\nplain text");
    expect(setTaskStatusInContent(content, 0, "cancelled")).toBe("- [-] Task #infra\nplain text");
    expect(setTaskStatusInContent(content, 1, "done")).toBe(content);
  });

  it("inserts a child using the parent's list style and indentation", () => {
    expect(insertChildInContent("* Parent\n* Sibling", 0)).toBe("* Parent\n  * [ ] \n* Sibling");
  });

  it("moves only the selected subtree among same-level siblings", () => {
    const content = "- A\n  - A child\n- B\n- C";

    expect(moveSubtreeInContent(content, 0, "down")).toBe("- B\n- A\n  - A child\n- C");
    expect(moveSubtreeInContent(content, 2, "up")).toBe("- B\n- A\n  - A child\n- C");
  });
});