import { describe, expect, it } from "vitest";
import { lintTemplate, TEMPLATE_SYNTAX_GUIDE } from "./template-lint";
import { TEMPLATE_TOKENS } from "./template-tokens";

describe("lintTemplate", () => {
  it("returns no warnings for a clean template", () => {
    const raw = "---\nstatus: draft\n---\n# {{title}}\nOwner: {{prompt:Owner}}\n{{cursor}}\n";
    expect(lintTemplate(raw)).toEqual([]);
  });

  it("treats other {{names}} as blanks, warning only about likely typos", () => {
    expect(lintTemplate("{{author}} {{task_1}} {{date}}")).toEqual([]);
    expect(lintTemplate("{{dat}} {{titl}}")).toEqual([
      expect.stringContaining("{{dat}} looks like {{date}}"),
      expect.stringContaining("{{titl}} looks like {{title}}"),
    ]);
    expect(lintTemplate("{{Title}} {{Year}}")).toEqual([]);
  });

  it("warns about math or formats on the wrong token and about non-fields", () => {
    expect(lintTemplate("{{date+1d:dddd}} {{time:HH}}")).toEqual([]);
    expect(lintTemplate("{{weekday+1d}}")).toEqual([expect.stringContaining("only {{date}} takes math")]);
    expect(lintTemplate("{{two words}}")).toEqual([expect.stringContaining("{{two words}} isn't a field")]);
  });

  it("doesn't warn about legacy tokens or the period formats", () => {
    expect(lintTemplate("{{weekSheet}} {{weekday}} {{year}} {{slug}} {{monthSheet-1m}}")).toEqual([]);
    expect(lintTemplate("# {{date:GGGG-[W]ww}}\n[[{{date-1w:GGGG-[W]ww}}]] {{date:YYYY-[Q]Q}}")).toEqual([]);
  });

  it("warns about an empty prompt label", () => {
    expect(lintTemplate("{{prompt: }}")).toEqual([expect.stringContaining("has no question")]);
  });

  it("warns about more than one cursor", () => {
    expect(lintTemplate("{{cursor}} {{cursor}}")).toEqual([expect.stringContaining("only the first counts")]);
  });

  it("says target_folder and file_name are no longer used", () => {
    expect(lintTemplate("---\ntarget_folder: rfcs\nfile_name: x\n---\nBody")).toEqual([
      expect.stringContaining('"target_folder" is no longer used'),
      expect.stringContaining('"file_name" is no longer used'),
    ]);
  });
});

describe("TEMPLATE_SYNTAX_GUIDE", () => {
  it("documents every token, and neither target_folder nor file_name", () => {
    for (const token of TEMPLATE_TOKENS) expect(TEMPLATE_SYNTAX_GUIDE).toContain(`{{${token}}}`);
    expect(TEMPLATE_SYNTAX_GUIDE).toContain("{{prompt:Label}}");
    expect(TEMPLATE_SYNTAX_GUIDE).not.toContain("target_folder");
    expect(TEMPLATE_SYNTAX_GUIDE).not.toContain("file_name");
  });

  it("documents the period formats and date fields, not the old sheet names", () => {
    for (const format of ["ww", "GGGG", "Q", "{{date:GGGG-[W]ww}}", "{{weekday}}", "{{year}}", "{{slug}}", "{{quarter}}"]) expect(TEMPLATE_SYNTAX_GUIDE).toContain(format);
    for (const legacy of ["weekSheet", "monthSheet", "yearSheet"]) {
      expect(TEMPLATE_SYNTAX_GUIDE).not.toContain(legacy);
    }
  });
});
