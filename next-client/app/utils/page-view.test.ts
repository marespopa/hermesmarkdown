import { describe, expect, it } from "vitest";
import { pageViewPayload } from "./page-view";

describe("pageViewPayload", () => {
  it("sends the path only, never the open note or tag", () => {
    const view = pageViewPayload("https://hermesmarkdown.com/editor?file=_templates/Journal/Daily.md#top", "", "1440x900", "UTC", 1);
    expect(view.loc).toBe("https://hermesmarkdown.com/editor");
    expect(pageViewPayload("https://hermesmarkdown.com/editor/tags?tag=roadmap", "", "", "", 1).loc)
      .toBe("https://hermesmarkdown.com/editor/tags");
  });

  it("keeps only the referrer's origin", () => {
    const view = pageViewPayload("https://hermesmarkdown.com/", "https://hermesmarkdown.com/editor?file=plan.md", "", "", 1);
    expect(view.ref).toBe("https://hermesmarkdown.com");
    expect(pageViewPayload("https://hermesmarkdown.com/", "", "", "", 1).ref).toBe("");
    expect(pageViewPayload("https://hermesmarkdown.com/", "not a url", "", "", 1).ref).toBe("");
  });
});
