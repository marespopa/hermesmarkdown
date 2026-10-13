import { describe, expect, it } from "vitest";
import { templateBody, templateContent } from "./template-frontmatter";

describe("templateContent", () => {
  it("keeps the retired target_folder and file_name keys out, and other keys in", () => {
    const raw = "---\ntarget_folder: rfcs\nfile_name: \"rfc-{{date}}-{{slug}}\"\nstatus: draft\n---\n# {{title}}\n";
    expect(templateContent(raw)).toBe("---\nstatus: draft\n---\n# {{title}}\n");
  });

  it("drops the frontmatter block when only retired keys were in it", () => {
    expect(templateContent("---\ntarget_folder: docs/rfcs\n---\n\n# {{title}}\n")).toBe("# {{title}}\n");
  });

  it("passes templates without frontmatter or retired keys through", () => {
    expect(templateContent("# Plain {{date}}\n")).toBe("# Plain {{date}}\n");
    const withOther = "---\ntags: [x]\n---\nBody\n";
    expect(templateContent(withOther)).toBe(withOther);
  });

  it("drops a block that holds only comments", () => {
    expect(templateContent("---\n# target_folder: notes\n# file_name: x\n---\n\n# {{title}}\n")).toBe("# {{title}}\n");
  });

  it("removes comment lines and retired keys together, keeping other keys", () => {
    const raw = "---\n# where notes go\nfile_name: x\n# kept out\nstatus: draft\n---\nBody\n";
    expect(templateContent(raw)).toBe("---\nstatus: draft\n---\nBody\n");
  });

  it("keeps indented # lines inside a block scalar", () => {
    const raw = "---\n# comment\nnotes: |\n  # x\n  y\n---\nBody\n";
    expect(templateContent(raw)).toBe("---\nnotes: |\n  # x\n  y\n---\nBody\n");
  });
});

describe("templateBody", () => {
  it("returns the content after the frontmatter block", () => {
    expect(templateBody("---\nstatus: draft\n---\n\n# Title\nText")).toBe("# Title\nText");
    expect(templateBody("# No frontmatter")).toBe("# No frontmatter");
  });
});
