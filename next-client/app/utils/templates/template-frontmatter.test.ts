import { describe, expect, it } from "vitest";
import { setTemplateTargetFolder, splitTemplate, templateBody } from "./template-frontmatter";

describe("splitTemplate", () => {
  it("takes the routing keys out and keeps other keys", () => {
    const raw = "---\ntarget_folder: rfcs\nfile_name: \"rfc-{{date}}-{{slug}}\"\nstatus: draft\n---\n# {{title}}\n";
    const { routing, content } = splitTemplate(raw);
    expect(routing).toEqual({ targetFolder: "rfcs", fileName: "rfc-{{date}}-{{slug}}" });
    expect(content).toBe("---\nstatus: draft\n---\n# {{title}}\n");
  });

  it("drops the frontmatter block when only routing keys were in it", () => {
    const { routing, content } = splitTemplate("---\ntarget_folder: docs/rfcs\n---\n\n# {{title}}\n");
    expect(routing).toEqual({ targetFolder: "docs/rfcs" });
    expect(content).toBe("# {{title}}\n");
  });

  it("passes templates without frontmatter or routing keys through", () => {
    expect(splitTemplate("# Plain {{date}}\n")).toEqual({ routing: {}, content: "# Plain {{date}}\n" });
    const withOther = "---\ntags: [x]\n---\nBody\n";
    expect(splitTemplate(withOther)).toEqual({ routing: {}, content: withOther });
  });

  it("drops a block that holds only comments", () => {
    const raw = "---\n# target_folder: notes\n# file_name: x\n---\n\n# {{title}}\n";
    expect(splitTemplate(raw)).toEqual({ routing: {}, content: "# {{title}}\n" });
  });

  it("removes comment lines and keeps other keys", () => {
    const raw = "---\n# a note for the template author\nstatus: draft\n---\nBody\n";
    expect(splitTemplate(raw)).toEqual({ routing: {}, content: "---\nstatus: draft\n---\nBody\n" });
  });

  it("removes comments and routing keys together", () => {
    const raw = "---\n# where notes go\ntarget_folder: rfcs\n# kept out\nstatus: draft\n---\nBody\n";
    expect(splitTemplate(raw)).toEqual({
      routing: { targetFolder: "rfcs" },
      content: "---\nstatus: draft\n---\nBody\n",
    });
  });

  it("keeps indented # lines inside a block scalar", () => {
    const raw = "---\n# comment\nnotes: |\n  # x\n  y\n---\nBody\n";
    expect(splitTemplate(raw)).toEqual({ routing: {}, content: "---\nnotes: |\n  # x\n  y\n---\nBody\n" });
  });
});

describe("templateBody", () => {
  it("returns the content after the frontmatter block", () => {
    expect(templateBody("---\nstatus: draft\n---\n\n# Title\nText")).toBe("# Title\nText");
    expect(templateBody("# No frontmatter")).toBe("# No frontmatter");
  });
});

describe("setTemplateTargetFolder", () => {
  it("adds a frontmatter block when there is none", () => {
    expect(setTemplateTargetFolder("# {{title}}\n", "meetings")).toBe("---\ntarget_folder: meetings\n---\n# {{title}}\n");
  });

  it("sets the key next to other frontmatter keys", () => {
    const next = setTemplateTargetFolder("---\nauthor: X\n---\nBody\n", "specs");
    expect(splitTemplate(next).routing.targetFolder).toBe("specs");
    expect(next).toContain("author: X");
  });

  it("drops the block when removing its only key", () => {
    expect(setTemplateTargetFolder("---\ntarget_folder: specs\n---\nBody\n", null)).toBe("Body\n");
  });

  it("leaves text without a block alone when clearing", () => {
    expect(setTemplateTargetFolder("Body\n", null)).toBe("Body\n");
  });
});
