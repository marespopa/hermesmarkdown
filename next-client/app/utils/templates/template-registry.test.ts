import { describe, expect, it } from "vitest";
import {
  suggestTemplateName,
  matchTemplateForName,
  groupTemplatePacks,
  isTemplatePath,
  listTemplates,
  parseMissingLink,
  resolveTemplatesFolder,
  sanitizeTemplateFileName,
  type TemplateEntry,
} from "./template-registry";

const entry = (name: string, folder = "_templates"): TemplateEntry => ({ name, path: `${folder}/${name}.md` });

describe("resolveTemplatesFolder", () => {
  it("is always _templates/ at the vault root, whatever else exists", () => {
    expect(resolveTemplatesFolder(["Templates/a.md", "_templates/b.md", "templates/c.md"])).toEqual({ folder: "_templates", exists: true });
    expect(resolveTemplatesFolder(["Templates/a.md", "templates/b.md"])).toEqual({ folder: "_templates", exists: false });
  });

  it("counts files directly in it or in a pack, not deeper", () => {
    expect(resolveTemplatesFolder(["_templates/Journal/Daily.md"]).exists).toBe(true);
    expect(resolveTemplatesFolder(["notes/x.md", "_templates/sub/deeper/y.md"]).exists).toBe(false);
  });
});

describe("listTemplates / isTemplatePath", () => {
  it("lists loose templates, then each pack's, sorted by name", () => {
    const paths = [
      "_templates/rfc.md", "_templates/Meeting.md", "_templates/Journal/Weekly.md", "_templates/Journal/Daily.md",
      "_templates/Areas/Work/deep.md", "_templates/img.png", "_templates/.hidden/x.md", "rfc.md",
    ];
    expect(listTemplates("_templates", paths)).toEqual([
      { name: "Meeting", path: "_templates/Meeting.md" },
      { name: "rfc", path: "_templates/rfc.md" },
      { name: "Daily", path: "_templates/Journal/Daily.md", pack: "Journal" },
      { name: "Weekly", path: "_templates/Journal/Weekly.md", pack: "Journal" },
    ]);
  });

  it("matches the folder's direct children and its packs' children only", () => {
    expect(isTemplatePath("_templates/rfc.md", "_templates")).toBe(true);
    expect(isTemplatePath("_templates/Journal/Daily.md", "_templates")).toBe(true);
    expect(isTemplatePath("_templates/a/b/rfc.md", "_templates")).toBe(false);
    expect(isTemplatePath("templates-old/rfc.md", "_templates")).toBe(false);
    expect(isTemplatePath("notes/rfc.md", "_templates")).toBe(false);
    expect(isTemplatePath("rfc.md", "")).toBe(false);
  });
});

describe("groupTemplatePacks", () => {
  it("groups loose templates first, then packs, keeping empty pack folders", () => {
    const templates = listTemplates("_templates", ["_templates/rfc.md", "_templates/Journal/Daily.md"]);
    const packs = groupTemplatePacks("_templates", templates, ["_templates", "_templates/Journal", "_templates/Empty", "notes"]);
    expect(packs.map((pack) => [pack.name, pack.folder, pack.templates.map((t) => t.name)])).toEqual([
      ["", "_templates", ["rfc"]],
      ["Empty", "_templates/Empty", []],
      ["Journal", "_templates/Journal", ["Daily"]],
    ]);
  });

  it("leaves out the loose group when it's empty", () => {
    const templates = listTemplates("_templates", ["_templates/Journal/Daily.md"]);
    expect(groupTemplatePacks("_templates", templates).map((pack) => pack.name)).toEqual(["Journal"]);
  });

});

describe("matchTemplateForName by folder", () => {
  it("matches the link's folder with or without a trailing s", () => {
    expect(matchTemplateForName("rfcs/auth", [entry("rfc")])?.name).toBe("rfc");
    expect(matchTemplateForName("rfc/auth", [entry("rfcs")])?.name).toBe("rfcs");
    expect(matchTemplateForName("RFCs/auth", [entry("rfc")])?.name).toBe("rfc");
  });

  it("prefers an exact name match", () => {
    expect(matchTemplateForName("rfcs/auth", [entry("rfc"), entry("rfcs")])?.name).toBe("rfcs");
  });

  it("returns null without a match", () => {
    expect(matchTemplateForName("meetings/standup", [entry("rfc")])).toBeNull();
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
  const t = (name: string) => ({ name, path: `_templates/${name}.md` });
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
