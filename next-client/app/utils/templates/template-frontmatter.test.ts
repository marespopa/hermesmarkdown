import { describe, expect, it } from "vitest";
import { splitTemplate, templateBody } from "./template-frontmatter";

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
});

describe("templateBody", () => {
  it("returns the content after the frontmatter block", () => {
    expect(templateBody("---\nstatus: draft\n---\n\n# Title\nText")).toBe("# Title\nText");
    expect(templateBody("# No frontmatter")).toBe("# No frontmatter");
  });
});
