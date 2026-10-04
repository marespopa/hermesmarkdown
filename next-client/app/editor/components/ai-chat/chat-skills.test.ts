import { describe, expect, it, vi } from "vitest";
import {
  isSkillActive,
  loadSkillInstructions,
  parseTemplateBlocks,
  TEMPLATE_SKILL,
} from "./chat-skills";

const notFound = () => Object.assign(new Error("missing"), { name: "NotFoundError" });

// A vault whose only file is `.hermes/skills/create-template.md` (or none).
function vaultWith(override: string | null, { failRead = false } = {}) {
  const file = {
    getFile: async () => {
      if (failRead) throw new Error("locked");
      return { text: async () => override ?? "" };
    },
  };
  const skills = { getFileHandle: vi.fn(async () => { if (override === null) throw notFound(); return file; }) };
  const hermes = { getDirectoryHandle: vi.fn(async () => skills) };
  return { getDirectoryHandle: vi.fn(async () => hermes) } as unknown as FileSystemDirectoryHandle;
}

describe("isSkillActive", () => {
  it("turns on for template / templates, or a /template message", () => {
    expect(isSkillActive(TEMPLATE_SKILL, ["make me an RFC template that asks for an owner"])).toBe(true);
    expect(isSkillActive(TEMPLATE_SKILL, ["hi", "Fix my Templates please"])).toBe(true);
    expect(isSkillActive(TEMPLATE_SKILL, ["/template meeting notes"])).toBe(true);
  });

  it("stays off otherwise", () => {
    expect(isSkillActive(TEMPLATE_SKILL, ["summarize this note", "templated text"])).toBe(false);
    expect(isSkillActive(TEMPLATE_SKILL, [])).toBe(false);
  });
});

describe("parseTemplateBlocks", () => {
  it("finds several blocks, keeping ``` code blocks inside a 4-tilde fence", () => {
    const reply = [
      "Here you go:",
      "~~~~hermes-template rfc.md",
      "# {{title}}",
      "```js",
      "code();",
      "```",
      "~~~~",
      "And another:",
      "~~~~hermes-template meeting",
      "Attendees: {{prompt:Who}}",
      "~~~~",
    ].join("\n");
    expect(parseTemplateBlocks(reply)).toEqual([
      { fileName: "rfc.md", content: "# {{title}}\n```js\ncode();\n```\n" },
      { fileName: "meeting.md", content: "Attendees: {{prompt:Who}}\n" },
    ]);
  });

  it("ignores ordinary code fences and unclosed blocks", () => {
    expect(parseTemplateBlocks("```md\n# x\n```")).toEqual([]);
    expect(parseTemplateBlocks("~~~~hermes-template a.md\nno end")).toEqual([]);
  });
});

describe("loadSkillInstructions", () => {
  it("uses the built-in text without a vault or an override file", async () => {
    expect(await loadSkillInstructions(TEMPLATE_SKILL, null)).toBe(TEMPLATE_SKILL.builtin);
    expect(await loadSkillInstructions(TEMPLATE_SKILL, vaultWith(null))).toBe(TEMPLATE_SKILL.builtin);
  });

  it("uses the override file's body when it exists", async () => {
    const vault = vaultWith("---\ndescription: mine\n---\nAlways add a Status line.");
    expect(await loadSkillInstructions(TEMPLATE_SKILL, vault)).toBe("Always add a Status line.");
  });

  it("falls back to the built-in text on a read error", async () => {
    expect(await loadSkillInstructions(TEMPLATE_SKILL, vaultWith("x", { failRead: true }))).toBe(TEMPLATE_SKILL.builtin);
  });

  it("builds the built-in text from the syntax guide and block format", () => {
    expect(TEMPLATE_SKILL.builtin).toContain("{{prompt:Label}}");
    expect(TEMPLATE_SKILL.builtin).toContain("~~~~hermes-template rfc.md");
  });
});
