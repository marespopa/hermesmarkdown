import { afterEach, describe, expect, it } from "vitest";
import {
  buildToolHandoff,
  HANDOFF_TTL_MS,
  MAX_HANDOFF_CHARS,
  parseToolHandoff,
  readToolHandoff,
  TOOL_HANDOFF_KEY,
  writeToolHandoff,
} from "./tool-handoff";

const NOW = 1_800_000_000_000;
const valid = buildToolHandoff("markdown-table", "Markdown table", "# Markdown table\n\n| a |\n| - |\n", NOW);
const raw = (overrides: Record<string, unknown>) => JSON.stringify({ ...valid, ...overrides });

describe("tool handoff", () => {
  afterEach(() => sessionStorage.clear());

  it("round-trips through sessionStorage", () => {
    expect(writeToolHandoff(valid)).toBe("ok");
    expect(readToolHandoff(sessionStorage, NOW)).toEqual(valid);
  });

  it("rejects malformed, empty, oversized and stale payloads", () => {
    expect(parseToolHandoff("{nope", NOW)).toBeNull();
    expect(parseToolHandoff(raw({ v: 2 }), NOW)).toBeNull();
    expect(parseToolHandoff(raw({ source: "pdf" }), NOW)).toBeNull();
    expect(parseToolHandoff(raw({ markdown: "  " }), NOW)).toBeNull();
    expect(parseToolHandoff(raw({ markdown: "x".repeat(MAX_HANDOFF_CHARS + 1) }), NOW)).toBeNull();
    expect(parseToolHandoff(raw({ title: "" }), NOW)).toBeNull();
    expect(parseToolHandoff(raw({ title: "t".repeat(61) }), NOW)).toBeNull();
    expect(parseToolHandoff(raw({ createdAt: NOW - HANDOFF_TTL_MS - 60_000 }), NOW)).toBeNull();
    expect(parseToolHandoff(raw({ createdAt: NOW + 61_000 }), NOW)).toBeNull();
    expect(parseToolHandoff(raw({}), NOW)).toEqual(valid);
  });

  it("removes an invalid payload when reading it", () => {
    sessionStorage.setItem(TOOL_HANDOFF_KEY, raw({ v: 2 }));
    expect(readToolHandoff(sessionStorage, NOW)).toBeNull();
    expect(sessionStorage.getItem(TOOL_HANDOFF_KEY)).toBeNull();
  });

  it("refuses oversized work without touching storage, and reports storage errors", () => {
    const big = buildToolHandoff("mermaid", "Mermaid diagram", "x".repeat(MAX_HANDOFF_CHARS + 1), NOW);
    expect(writeToolHandoff(big)).toBe("too-large");
    expect(sessionStorage.getItem(TOOL_HANDOFF_KEY)).toBeNull();

    const throwing = { setItem: () => { throw new Error("quota"); } } as unknown as Storage;
    expect(writeToolHandoff(valid, throwing)).toBe("storage-error");
  });
});
