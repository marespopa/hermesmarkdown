import { describe, it, expect } from "vitest";
import { parseVaultIndex } from "./vault-index-reader";

describe("parseVaultIndex", () => {
  it("parses version and generated timestamp", () => {
    const yaml = [
      "version: 1",
      "generated: 2026-06-19T10:00:00.000Z",
      "files:",
      "  []",
    ].join("\n");
    const { version, generated } = parseVaultIndex(yaml);
    expect(version).toBe(1);
    expect(generated).toBe("2026-06-19T10:00:00.000Z");
  });

  it("parses an empty files list", () => {
    const yaml = ["version: 1", "generated: 2026-06-19T10:00:00.000Z", "files:", "  []"].join("\n");
    expect(parseVaultIndex(yaml).entries).toEqual([]);
  });

  it("round-trips a full entry written by buildYaml's format", () => {
    const yaml = [
      "version: 1",
      "generated: 2026-06-19T10:00:00.000Z",
      "files:",
      "  - path: notes/billing.md",
      "    title: Billing Notes",
      "    status: active",
      '    scope: "How we handle billing disputes"',
      '    read_when: ["keywords: billing, invoice", "always"]',
      "    related: null",
      "    tags: [finance, ops]",
    ].join("\n");

    const { entries } = parseVaultIndex(yaml);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      path: "notes/billing.md",
      title: "Billing Notes",
      status: "active",
      scope: "How we handle billing disputes",
      read_when: ["keywords: billing, invoice", "always"],
      related: [],
      tags: ["finance", "ops"],
    });
  });

  it("treats null scalars as null and empty arrays as []", () => {
    const yaml = [
      "version: 1",
      "generated: 2026-06-19T10:00:00.000Z",
      "files:",
      "  - path: orphan.md",
      "    title: Orphan",
      "    status: null",
      "    scope: null",
      "    read_when: null",
      "    related: null",
      "    tags: []",
    ].join("\n");

    const { entries } = parseVaultIndex(yaml);
    expect(entries[0].status).toBeNull();
    expect(entries[0].scope).toBeNull();
    expect(entries[0].read_when).toEqual([]);
    expect(entries[0].tags).toEqual([]);
  });

  it("parses multiple entries", () => {
    const yaml = [
      "version: 1",
      "generated: 2026-06-19T10:00:00.000Z",
      "files:",
      "  - path: a.md",
      "    title: A",
      "    status: draft",
      "    scope: null",
      "    read_when: null",
      "    related: null",
      "    tags: []",
      "  - path: b.md",
      "    title: B",
      "    status: active",
      "    scope: null",
      "    read_when: [always]",
      "    related: null",
      "    tags: []",
    ].join("\n");

    const { entries } = parseVaultIndex(yaml);
    expect(entries.map((e) => e.path)).toEqual(["a.md", "b.md"]);
    expect(entries[1].read_when).toEqual(["always"]);
  });
});
