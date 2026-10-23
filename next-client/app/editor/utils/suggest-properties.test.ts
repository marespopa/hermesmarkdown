// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildSuggestPropertiesPrompt,
  missingProperties,
  parseSuggestedProperties,
  propertiesEdit,
  topVaultTags,
} from "./suggest-properties";

const withFrontmatter = [
  "---",
  "title: Release plan",
  "# kept as written",
  "status: draft",
  "tags: []",
  "---",
  "",
  "# Release plan",
  "Ship the editor update.",
].join("\n");

describe("missingProperties", () => {
  it("lists the keys a note lacks or has empty", () => {
    expect(missingProperties(withFrontmatter)).toEqual(["description", "tags"]);
  });

  it("lists every key for a note without frontmatter", () => {
    expect(missingProperties("Just text")).toEqual(["title", "description", "tags"]);
  });

  it("treats a quoted empty value as missing", () => {
    expect(missingProperties('---\ntitle: ""\ndescription: x\ntags: [a]\n---\n')).toEqual(["title"]);
  });
});

describe("buildSuggestPropertiesPrompt", () => {
  it("asks for the missing keys with the note body and vault tags", () => {
    const prompt = buildSuggestPropertiesPrompt(withFrontmatter, ["description", "tags"], ["work", "release"]);
    expect(prompt).toContain("SUGGEST THESE PROPERTIES: description, tags");
    expect(prompt).toContain("title: Release plan");
    expect(prompt).toContain("work, release");
    expect(prompt).toContain("Ship the editor update.");
    expect(prompt).not.toContain("status: draft");
  });
});

describe("parseSuggestedProperties", () => {
  it("reads a fenced JSON reply and cleans the values", () => {
    const reply = '```json\n{"title": "# The \\"big\\" plan", "description": "Plans\\nthe release.", "tags": ["#Work", "Release Notes", "work"]}\n```';
    expect(parseSuggestedProperties(reply)).toEqual({
      title: "The big plan",
      description: "Plans the release.",
      tags: ["work", "release-notes"],
    });
  });

  it("returns null for a reply without JSON", () => {
    expect(parseSuggestedProperties("Sorry, I can't.")).toBeNull();
    expect(parseSuggestedProperties("{not json}")).toBeNull();
  });
});

describe("propertiesEdit", () => {
  const suggested = { title: "Other title", description: "Plans the release.", tags: ["work", "release"] };

  it("fills only the missing keys and keeps the rest of the block as written", () => {
    const edit = propertiesEdit(withFrontmatter, ["description", "tags"], suggested)!;
    expect(edit.from).toBe(0);
    expect(edit.original).toBe(withFrontmatter.slice(0, withFrontmatter.indexOf("\n\n#")));
    expect(edit.replacement).toBe(
      ["---", "title: Release plan", "# kept as written", "status: draft", "tags: [work, release]", 'description: "Plans the release."', "---"].join("\n"),
    );
    // The body after the block is untouched.
    const applied = withFrontmatter.slice(0, edit.from) + edit.replacement + withFrontmatter.slice(edit.to);
    expect(applied.endsWith("\n\n# Release plan\nShip the editor update.")).toBe(true);
  });

  it("adds a new block at the start of a note without one", () => {
    const edit = propertiesEdit("Text", ["title", "tags"], suggested)!;
    expect(edit).toEqual({ from: 0, to: 0, original: "", replacement: '---\ntitle: "Other title"\ntags: [work, release]\n---\n\n' });
  });

  it("returns null when nothing would change", () => {
    expect(propertiesEdit(withFrontmatter, ["description"], { title: "x" })).toBeNull();
  });
});

describe("topVaultTags", () => {
  it("orders tags by use, then name", () => {
    expect(topVaultTags([["work", "ideas"], ["work"], ["alpha"]], 2)).toEqual(["work", "alpha"]);
  });
});
