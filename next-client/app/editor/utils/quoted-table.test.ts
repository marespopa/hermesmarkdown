import { describe, expect, it } from "vitest";
import { maskQuotedRow, maskQuotedRows, quotedRowPrefix, restoreQuotePrefix } from "./quoted-table";

describe("quoted tables", () => {
  it("finds a quoted table row's prefix, nested quotes included", () => {
    expect(quotedRowPrefix("> | a | b |")).toBe("> ");
    expect(quotedRowPrefix("> > | a |")).toBe("> > ");
    expect(quotedRowPrefix("> plain text")).toBe("");
    expect(quotedRowPrefix("| a | b |")).toBe("");
  });

  it("masks only quoted table rows, keeping every offset", () => {
    const text = "> [!note] Title\n> | a | b |\n> |---|---|";
    const masked = maskQuotedRows(text);
    expect(masked).toBe("> [!note] Title\n  | a | b |\n  |---|---|");
    expect(masked.length).toBe(text.length);
    expect(maskQuotedRow("> text")).toBe("> text");
  });

  it("puts the prefix back over the masked spaces, or before a row written without them", () => {
    expect(restoreQuotePrefix("  | a |\n| b |", "> ")).toBe("> | a |\n> | b |");
    expect(restoreQuotePrefix("| a |", "")).toBe("| a |");
  });
});
