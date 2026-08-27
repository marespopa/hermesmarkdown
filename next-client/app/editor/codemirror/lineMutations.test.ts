import { describe, expect, it } from "vitest";
import {
  indentSubtreeInContent,
  insertChildInContent,
  moveSubtreeInContent,
  outdentSubtreeInContent,
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

  it("inserts a child using the parent's list style and indentation", () => {
    expect(insertChildInContent("* Parent\n* Sibling", 0)).toBe("* Parent\n  * [ ] \n* Sibling");
  });

  it("moves only the selected subtree among same-level siblings", () => {
    const content = "- A\n  - A child\n- B\n- C";

    expect(moveSubtreeInContent(content, 0, "down")).toBe("- B\n- A\n  - A child\n- C");
    expect(moveSubtreeInContent(content, 2, "up")).toBe("- B\n- A\n  - A child\n- C");
  });
});