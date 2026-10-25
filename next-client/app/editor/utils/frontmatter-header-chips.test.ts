import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { frontmatterHeaderChips, frontmatterValueSpan, shortDate } from "./frontmatter-header-chips";

const block = (...lines: string[]) => ["---", ...lines, "---"].join("\n");
const labels = (text: string) => frontmatterHeaderChips(text)?.map((chip) => chip.label);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 25));
});
afterEach(() => vi.useRealTimers());

describe("frontmatterHeaderChips", () => {
  it("orders type, tags, status, dates, then other fields", () => {
    const text = block(
      "priority: high",
      "created: 2026-10-01",
      "date: 2026-11-02",
      "due_date: 2026-11-15",
      "status: in-progress",
      "tags: [work, roadmap]",
      "type: project",
    );
    expect(labels(text)).toEqual([
      "project", "#work", "#roadmap", "in-progress", "Due Nov 15", "Nov 2", "created Oct 1", "priority high",
    ]);
  });

  it("reads tags in flow, list and bare forms, and folds past three into +N", () => {
    expect(labels(block("tags: [a, b]"))).toEqual(["#a", "#b"]);
    expect(labels(block("tags:", "  - a", "  - 'b'"))).toEqual(["#a", "#b"]);
    expect(labels(block("tags: a, b"))).toEqual(["#a", "#b"]);
    const chips = frontmatterHeaderChips(block("tags: [a, b, c, d, e]"))!;
    expect(chips.map((chip) => chip.label)).toEqual(["#a", "#b", "#c", "+2"]);
    expect(chips[3].kind).toBe("more-tags");
    expect(chips[0].value).toBe("a");
  });

  it("shows the year only outside the current one, and recognizes datetimes", () => {
    expect(labels(block("due: 2027-01-05"))).toEqual(["Due Jan 5, 2027"]);
    expect(labels(block("updated: 2026-10-24T15:14:54Z"))).toEqual(["updated Oct 24"]);
    expect(shortDate("2026-02-30")).toBeNull();
    expect(shortDate("soon")).toBeNull();
  });

  it("unquotes values, shows title alone, and treats booleans and empties", () => {
    const text = block("title: \"Release plan\"", "private: true", "archived: false", "owner:", "tags: []", "kind: 'a b'");
    expect(labels(text)).toEqual(["Release plan", "private", "kind a b"]);
    const kind = frontmatterHeaderChips(text)!.find((chip) => chip.key === "kind")!;
    expect(kind.keyLabel).toBe("kind");
    expect(kind.ariaLabel).toBe("kind: a b, edit");
  });

  it("labels status and date chips for assistive tech", () => {
    const chips = frontmatterHeaderChips(block("status: done", "due_date: 2026-11-15", "type: project"))!;
    expect(chips.map((chip) => chip.ariaLabel)).toEqual([
      "type: project, edit", "status: done, change status", "due_date: 2026-11-15, change date",
    ]);
    expect(chips[1].line).toBe(1);
  });

  it("lists scalars, takes a block scalar's first line, ignores comments, and cuts long labels", () => {
    expect(labels(block("# note", "aliases: [x, y]"))).toEqual(["aliases x, y"]);
    expect(labels(block("summary: |", "  first line", "  second"))).toEqual(["summary first line"]);
    expect(labels(block("status: draft # for now"))).toEqual(["draft"]);
    const long = labels(block(`note: ${"w".repeat(60)}`))![0];
    expect(long).toHaveLength(40);
    expect(long.endsWith("…")).toBe(true);
  });

  it("returns null when the YAML is not simple or gives no chip", () => {
    expect(frontmatterHeaderChips(block("meta:", "  sub: x"))).toBeNull();
    expect(frontmatterHeaderChips(block("steps:", "  - name: build"))).toBeNull();
    expect(frontmatterHeaderChips(block("meta: {a: 1}"))).toBeNull();
    expect(frontmatterHeaderChips(block("title: \"open"))).toBeNull();
    expect(frontmatterHeaderChips(block("status: a", "status: b"))).toBeNull();
    expect(frontmatterHeaderChips(block("title: Plan: v2"))).toBeNull();
    expect(frontmatterHeaderChips(block("title: {{title}}"))).toBeNull();
    expect(frontmatterHeaderChips(block("title:", "tags: []"))).toBeNull();
  });
});

describe("frontmatterValueSpan", () => {
  const slice = (text: string, key: string) => {
    const span = frontmatterValueSpan(text, key);
    return span && text.slice(span.from, span.to);
  };

  it("finds bare, quoted and commented values", () => {
    expect(slice(block("status: draft"), "status")).toBe("draft");
    expect(slice(block("status: \"in progress\""), "status")).toBe("in progress");
    expect(slice(block("status: 'done'"), "status")).toBe("done");
    expect(slice(block("status: draft # later"), "status")).toBe("draft");
  });

  it("is null for a missing key", () => {
    expect(frontmatterValueSpan(block("title: A"), "status")).toBeNull();
  });

  it("is an empty span at the end of an empty value's line", () => {
    const text = block("status:");
    const span = frontmatterValueSpan(text, "status")!;
    expect(span.from).toBe(span.to);
    expect(span.from).toBe(text.indexOf("status:") + "status:".length);
  });
});
