import { describe, expect, it } from "vitest";
import { templateIcon, templatePreview, templateSummary } from "./template-preview";
import { TEMPLATE_STARTERS } from "./template-starter";

const NOW = new Date(2026, 9, 5, 9, 0);

describe("templateIcon", () => {
  it("picks an icon from the name", () => {
    expect(templateIcon("Meeting notes")).toBe("calendar");
    expect(templateIcon("Bug Report")).toBe("bolt");
    expect(templateIcon("Tech Spec")).toBe("rocket");
    expect(templateIcon("Daily Standup")).toBe("sun");
    expect(templateIcon("Weekly report")).toBe("chart");
    expect(templateIcon("Groceries")).toBe("document");
  });
});

describe("templateSummary", () => {
  it("describes sections, tasks, date and questions", () => {
    const meeting = TEMPLATE_STARTERS.find((s) => s.name === "Meeting notes")!;
    expect(templateSummary(meeting.body)).toBe("5 sections • Action items • Today's date • Asks Attendees");
    expect(templateSummary("Date: {{date}}\nOwner: {{prompt:Owner}}")).toBe("Today's date • Asks Owner");
  });

  it("falls back to Plain note", () => {
    expect(templateSummary("Just text")).toBe("Plain note");
  });
});

describe("templatePreview", () => {
  it("fills in dates and title, keeps questions as pills and lists properties", () => {
    const raw = "---\nauthor: {{prompt:Author}}\ndate: {{date}}\n---\n# {{title}}\n\n\n## Agenda\n- [ ] Ship\n- item\n{{cursor}}\n";
    const { properties, lines } = templatePreview(raw, "Sync", NOW);
    expect(properties).toEqual([["author", "Author"], ["date", "2026-10-05"]]);
    expect(lines.map((l) => l.kind)).toEqual(["h1", "blank", "h2", "task", "bullet"]);
    expect(lines[0].segments).toEqual([{ text: "Sync" }]);
    expect(lines[3].segments).toEqual([{ text: "Ship" }]);
  });

  it("marks questions in the body", () => {
    const { lines } = templatePreview("Owner: {{prompt:Owner}}", "x", NOW);
    expect(lines[0].segments).toEqual([{ text: "Owner: " }, { text: "Owner", question: true }]);
  });
});
