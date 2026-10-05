import { describe, expect, it } from "vitest";
import {
  suggestTemplateName,
  matchTemplateForName,
  isTemplatePath,
  listTemplates,
  matchTemplateForFolder,
  parseMissingLink,
  resolveTemplatesFolder,
  sanitizeNoteName,
  sanitizeTemplateFileName,
  type TemplateEntry,
} from "./template-registry";

const entry = (name: string, folder = "templates"): TemplateEntry => ({ name, path: `${folder}/${name}.md` });

describe("resolveTemplatesFolder", () => {
  const paths = ["Templates/a.md", "_templates/b.md", "notes/x.md"];

  it("uses the setting when set (normalized)", () => {
    expect(resolveTemplatesFolder("/_tpl/ ", [...paths, "_tpl/c.md"])).toEqual({ folder: "_tpl", exists: true });
    expect(resolveTemplatesFolder("missing", paths)).toEqual({ folder: "missing", exists: false });
  });

  it("falls back to templates, then _templates, then Templates", () => {
    expect(resolveTemplatesFolder(undefined, [...paths, "templates/c.md"]).folder).toBe("templates");
    expect(resolveTemplatesFolder("", paths).folder).toBe("_templates");
    expect(resolveTemplatesFolder(undefined, ["Templates/a.md"]).folder).toBe("Templates");
  });

  it("reports a missing folder as templates, exists: false", () => {
    expect(resolveTemplatesFolder(undefined, ["notes/x.md", "templates/sub/y.md"]))
      .toEqual({ folder: "templates", exists: false });
  });
});

describe("listTemplates / isTemplatePath", () => {
  it("lists only direct .md children, sorted by name", () => {
    const paths = ["templates/rfc.md", "templates/Meeting.md", "templates/sub/deep.md", "templates/img.png", "rfc.md"];
    expect(listTemplates("templates", paths)).toEqual([
      { name: "Meeting", path: "templates/Meeting.md" },
      { name: "rfc", path: "templates/rfc.md" },
    ]);
  });

  it("matches only direct children of the folder", () => {
    expect(isTemplatePath("templates/rfc.md", "templates")).toBe(true);
    expect(isTemplatePath("templates/sub/rfc.md", "templates")).toBe(false);
    expect(isTemplatePath("notes/rfc.md", "templates")).toBe(false);
    expect(isTemplatePath("rfc.md", "")).toBe(false);
  });
});

describe("matchTemplateForFolder", () => {
  it("matches with or without a trailing s", () => {
    expect(matchTemplateForFolder("rfcs", [entry("rfc")])?.name).toBe("rfc");
    expect(matchTemplateForFolder("rfc", [entry("rfcs")])?.name).toBe("rfcs");
    expect(matchTemplateForFolder("RFCs", [entry("rfc")])?.name).toBe("rfc");
  });

  it("prefers an exact name match", () => {
    expect(matchTemplateForFolder("rfcs", [entry("rfc"), entry("rfcs")])?.name).toBe("rfcs");
  });

  it("returns null without a match", () => {
    expect(matchTemplateForFolder("meetings", [entry("rfc")])).toBeNull();
  });
});

describe("parseMissingLink", () => {
  it("strips alias, heading and .md", () => {
    expect(parseMissingLink("rfcs/auth-spec|Auth")).toEqual({ folder: "rfcs", baseName: "auth-spec" });
    expect(parseMissingLink("rfcs/auth-spec#Goals")).toEqual({ folder: "rfcs", baseName: "auth-spec" });
    expect(parseMissingLink("docs/rfcs/auth.md")).toEqual({ folder: "docs/rfcs", baseName: "auth" });
  });

  it("gives a null folder for a folderless link", () => {
    expect(parseMissingLink("idea")).toEqual({ folder: null, baseName: "idea" });
  });

  it("normalizes ../ out of the folder", () => {
    expect(parseMissingLink("../x/./y")).toEqual({ folder: "x", baseName: "y" });
    expect(parseMissingLink("../y")).toEqual({ folder: null, baseName: "y" });
  });

  it("rejects invalid or empty names", () => {
    expect(parseMissingLink("bad:name")).toBeNull();
    expect(parseMissingLink("what?")).toBeNull();
    expect(parseMissingLink("")).toBeNull();
    expect(parseMissingLink("folder/")).toBeNull();
    expect(parseMissingLink("|alias")).toBeNull();
  });
});

describe("sanitizeNoteName", () => {
  it("replaces forbidden characters and strips .md", () => {
    expect(sanitizeNoteName(" a/b:c?.md ")).toBe("a-b-c-");
    expect(sanitizeNoteName("Auth Spec")).toBe("Auth Spec");
  });

  it("falls back to untitled", () => {
    expect(sanitizeNoteName("  ")).toBe("untitled");
    expect(sanitizeNoteName(".md")).toBe("untitled");
  });
});

describe("sanitizeTemplateFileName", () => {
  it("keeps the base name only and adds .md", () => {
    expect(sanitizeTemplateFileName("../x")).toBe("x.md");
    expect(sanitizeTemplateFileName("a/b.md")).toBe("b.md");
    expect(sanitizeTemplateFileName("  ")).toBe("template.md");
    expect(sanitizeTemplateFileName("..")).toBe("template.md");
  });

  it("never yields a dot-file", () => {
    expect(sanitizeTemplateFileName(".hidden")).toBe("hidden.md");
    expect(sanitizeTemplateFileName("...")).toBe("template.md");
    expect(sanitizeTemplateFileName("../evil/.Rfc.md")).toBe("Rfc.md");
    expect(sanitizeTemplateFileName("a/ .x")).toBe("x.md");
  });

  it("keeps spaces and case, replaces forbidden characters, normalises .md", () => {
    expect(sanitizeTemplateFileName("Meeting Notes")).toBe("Meeting Notes.md");
    expect(sanitizeTemplateFileName("a:b?")).toBe("a-b-.md");
    expect(sanitizeTemplateFileName("x.MD")).toBe("x.md");
  });
});

describe("suggestTemplateName", () => {
  it("uses the first heading below the frontmatter, without fields", () => {
    expect(suggestTemplateName("---\ntitle: x\n---\n# Weekly {{date}} sync\n## Agenda", "note")).toBe("Weekly sync");
  });

  it("falls back to the note title", () => {
    expect(suggestTemplateName("No heading", " Standup ")).toBe("Standup");
    expect(suggestTemplateName("# {{title}}", "Standup")).toBe("Standup");
  });
});

describe("matchTemplateForName", () => {
  const t = (name: string) => ({ name, path: `templates/${name}.md` });
  const templates = [t("Meeting notes"), t("Meeting"), t("rfc"), t("Journal"), t("Spec")];
  const match = (name: string) => matchTemplateForName(name, templates)?.name ?? null;

  it("matches by folder, as for missing links", () => {
    expect(match("rfcs/auth")).toBe("rfc");
  });

  it("matches a template that starts the name, longest first", () => {
    expect(match("Meeting notes 2026-10-05")).toBe("Meeting notes");
    expect(match("meeting-standup")).toBe("Meeting");
    expect(match("rfc-auth")).toBe("rfc");
    expect(match("Specs for login")).toBe("Spec");
  });

  it("matches a journal-like template for a date name", () => {
    expect(match("2026-10-05")).toBe("Journal");
  });

  it("returns null when nothing fits", () => {
    expect(match("Groceries")).toBeNull();
    expect(match("my meeting")).toBeNull();
    expect(matchTemplateForName("x", [])).toBeNull();
  });
});
