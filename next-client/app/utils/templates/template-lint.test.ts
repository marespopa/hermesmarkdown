import { describe, expect, it } from "vitest";
import { lintTemplate, TEMPLATE_SYNTAX_GUIDE } from "./template-lint";
import { TEMPLATE_TOKENS } from "./template-tokens";

describe("lintTemplate", () => {
  it("returns no warnings for a clean template", () => {
    const raw = "---\ntarget_folder: rfcs\nfile_name: rfc-{{date}}\n---\n# {{title}}\nOwner: {{prompt:Owner}}\n{{cursor}}\n";
    expect(lintTemplate(raw)).toEqual([]);
  });

  it("treats other {{names}} as blanks, warning only about likely typos", () => {
    expect(lintTemplate("{{author}} {{task_1}} {{date}}")).toEqual([]);
    expect(lintTemplate("{{dat}} {{Title}}")).toEqual([
      expect.stringContaining("{{dat}} looks like {{date}}"),
      expect.stringContaining("{{Title}} looks like {{title}}"),
    ]);
  });

  it("warns about math or formats on the wrong token and about non-fields", () => {
    expect(lintTemplate("{{date+1d:dddd}} {{time:HH}}")).toEqual([]);
    expect(lintTemplate("{{weekday+1d}}")).toEqual([expect.stringContaining("only {{date}} takes math")]);
    expect(lintTemplate("{{two words}}")).toEqual([expect.stringContaining("{{two words}} isn't a field")]);
  });

  it("warns about an empty prompt label", () => {
    expect(lintTemplate("{{prompt: }}")).toEqual([expect.stringContaining("has no question")]);
  });

  it("warns about more than one cursor", () => {
    expect(lintTemplate("{{cursor}} {{cursor}}")).toEqual([expect.stringContaining("only the first counts")]);
  });

  it("warns about misspelled routing keys", () => {
    const warnings = lintTemplate("---\ntarget-folder: rfcs\nfilename: x\n---\nBody");
    expect(warnings).toEqual([
      expect.stringContaining('"target-folder" should be spelled "target_folder"'),
      expect.stringContaining('"filename" should be spelled "file_name"'),
    ]);
  });
});

describe("TEMPLATE_SYNTAX_GUIDE", () => {
  it("documents every token and both routing keys", () => {
    for (const token of TEMPLATE_TOKENS) expect(TEMPLATE_SYNTAX_GUIDE).toContain(`{{${token}}}`);
    expect(TEMPLATE_SYNTAX_GUIDE).toContain("{{prompt:Label}}");
    expect(TEMPLATE_SYNTAX_GUIDE).toContain("target_folder");
    expect(TEMPLATE_SYNTAX_GUIDE).toContain("file_name");
  });
});
