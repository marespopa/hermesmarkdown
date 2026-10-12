import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadMarkdown, markdownFileName } from "./download-markdown";

describe("markdownFileName", () => {
  it("keeps a note's .md name and adds the extension otherwise", () => {
    expect(markdownFileName("Ideas.md", "# Ideas")).toBe("Ideas.md");
    expect(markdownFileName("Ideas", "# Ideas")).toBe("Ideas.md");
  });

  it("names a draft from its first line, or untitled", () => {
    expect(markdownFileName("", "# Weekly plan!\nbody")).toBe("Weekly plan.md");
    expect(markdownFileName("  ", "!!!")).toBe("untitled.md");
  });
});

describe("downloadMarkdown", () => {
  afterEach(() => vi.restoreAllMocks());

  it("clicks a download link for a Markdown blob and cleans up", () => {
    const createObjectURL = vi.fn(() => "blob:note");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    expect(downloadMarkdown("# Note", "Note.md")).toBe("Note.md");

    const clicked = click.mock.contexts[0] as HTMLAnchorElement;

    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toBe("text/markdown");
    expect(clicked.download).toBe("Note.md");
    expect(clicked.href).toBe("blob:note");
    expect(document.body.contains(clicked)).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:note");
  });
});
