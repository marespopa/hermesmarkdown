import { describe, expect, it } from "vitest";
import { buildCommands } from "./slash-menu";

describe("slash menu commands", () => {
  it("includes a Mermaid block command", () => {
    const titles = buildCommands().map((cmd) => cmd.title);
    expect(titles).toContain("Mermaid Block");
  });
});
