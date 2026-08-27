import { describe, expect, it } from "vitest";
import { parseOutline } from "./tolerantOutlineParser";

describe("parseOutline", () => {
  it("parses heading and nested task relationships", () => {
    const document = parseOutline(
      "note.md",
      "# Sprint\n\n## Core\n- [ ] Ship report @due(2026-09-01) @priority(high) #todo\n  - [/] Review report @context(work)\n",
      42,
    );

    expect(document.mtime).toBe(42);
    expect(document.nodes.map((node) => node.textContent)).toEqual([
      "Sprint",
      "Core",
      "Ship report",
      "Review report",
    ]);
    expect(document.tasks).toHaveLength(2);
    expect(document.tasks[0]).toMatchObject({
      taskState: "todo",
      metadata: { due: "2026-09-01", priority: "high", tags: ["todo"] },
      parentHeading: "Core",
    });
    expect(document.tasks[1]).toMatchObject({
      taskState: "in_progress",
      parentId: document.tasks[0].id,
      metadata: { context: ["work"] },
    });
  });

  it("preserves source ranges and recognizes all task states", () => {
    const content = "- [ ] Todo\n- [/] Doing\n- [x] Done\n- [-] Canceled";
    const document = parseOutline("tasks.md", content);

    expect(document.tasks.map((node) => node.taskState)).toEqual([
      "todo",
      "in_progress",
      "done",
      "canceled",
    ]);
    expect(document.nodes.map((node) => content.slice(node.range.from, node.range.to))).toEqual(
      content.split("\n"),
    );
  });

  it("ignores prose and supports numbered list items", () => {
    const document = parseOutline("note.md", "Prose\n1. First\n   2. Second\n");

    expect(document.nodes).toHaveLength(2);
    expect(document.nodes[1].parentId).toBe(document.nodes[0].id);
    expect(document.tasks).toHaveLength(0);
  });
});