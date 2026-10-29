import { describe, expect, it } from "vitest";
import { proposalFeedback } from "./proposal-feedback";

const collect = (set: ReturnType<typeof proposalFeedback>) => {
  const found: Array<{ from: number; to: number; cls?: string; widget: boolean }> = [];
  set.between(0, 1000, (from, to, value) => {
    found.push({ from, to, cls: value.spec.class, widget: !!value.spec.widget });
  });
  return found;
};

describe("proposalFeedback", () => {
  it("strikes through replaced text and ghosts the proposed text after it", () => {
    const found = collect(proposalFeedback([{ from: 0, to: 6, insert: "After", active: true }]));

    expect(found.find((item) => !item.widget)?.cls).toContain("cm-ai-proposal-delete");
    expect(found.find((item) => item.widget)).toMatchObject({ from: 6, to: 6 });
  });

  it("shows a pure insertion as ghost text without strikethrough", () => {
    const found = collect(proposalFeedback([{ from: 4, to: 4, insert: "two\n" }], 20));

    expect(found.some((item) => item.cls?.includes("cm-ai-proposal-delete"))).toBe(false);
    expect(found.some((item) => item.widget)).toBe(true);
  });

  it("adds Accept and Reject controls to the active hunk only", () => {
    const onDecide = () => {};
    const active = collect(proposalFeedback([{ from: 0, to: 6, insert: "After", active: true, onDecide }]));
    const inactive = collect(proposalFeedback([{ from: 0, to: 6, insert: "After", onDecide }]));

    expect(active.filter((item) => item.widget)).toHaveLength(2);
    expect(inactive.filter((item) => item.widget)).toHaveLength(1);
  });

  it("reports the button clicked", () => {
    const decisions: string[] = [];
    const set = proposalFeedback([{ from: 0, to: 6, insert: "After", active: true, onDecide: (d) => decisions.push(d) }]);
    set.between(0, 1000, (_from, _to, value) => {
      const widget = value.spec.widget;
      if (!widget || !("onDecide" in widget)) return;
      const el = widget.toDOM() as HTMLElement;
      el.querySelectorAll("button").forEach((button) => button.click());
    });

    expect(decisions).toEqual(["accepted", "rejected"]);
  });
});
