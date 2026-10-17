import { describe, expect, it } from "vitest";
import { rankSlashCommands, slashMatchScore, type SlashCommand } from "./slash-commands";

const command = (label: string, description = "", aliases: string[] = []): SlashCommand => ({ label, description, aliases });

describe("slashMatchScore", () => {
  const heading = command("Heading 1", "Big section heading", ["h1", "#"]);

  it("ranks an exact name or alias, then the name's start, an alias's start, a later word, the description, the letters", () => {
    expect(slashMatchScore(heading, "h1")).toBe(0);
    expect(slashMatchScore(heading, "heading-1")).toBe(0);
    expect(slashMatchScore(heading, "head")).toBe(1);
    expect(slashMatchScore(command("Frontmatter", "", ["yaml"]), "ya")).toBe(2);
    expect(slashMatchScore(command("Bulleted list"), "li")).toBe(3);
    expect(slashMatchScore(heading, "section")).toBe(4);
    expect(slashMatchScore(heading, "hdg")).toBe(5);
    expect(slashMatchScore(heading, "xyz")).toBeNull();
  });

  it("matches the description only from three letters", () => {
    expect(slashMatchScore(heading, "se")).toBeNull();
  });

  it("finds a symbol alias", () => {
    expect(slashMatchScore(heading, "#")).toBe(0);
  });
});

describe("rankSlashCommands", () => {
  it("puts the best matches first and keeps the given order between equals", () => {
    const commands = [command("Callout"), command("Code"), command("Collapse"), command("Table", "Columns and rows")];

    expect(rankSlashCommands(commands, "co").map(({ label }) => label)).toEqual(["Code", "Collapse", "Callout"]);
    expect(rankSlashCommands(commands, "").map(({ label }) => label)).toEqual(["Callout", "Code", "Collapse", "Table"]);
  });
});
