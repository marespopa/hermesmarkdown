import { describe, it, expect } from "vitest";
import { evaluateQuery, WorkspaceQuery } from "./queryEngine";
import { FileMetadata } from "../atoms/metadata";

describe("queryEngine", () => {
  const mockFile: FileMetadata = {
    path: "test.md",
    name: "test.md",
    tags: ["#todo", "#work"],
    frontmatter: { status: "active", priority: "high" },
    modifiedAt: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
    wordCount: 100,
    links: [],
    handle: {} as any,
  };

  it("should match tags with includes", () => {
    const query: WorkspaceQuery = {
      operator: "AND",
      rules: [{ field: "tags", condition: "includes", value: "#todo" }],
    };
    expect(evaluateQuery(mockFile, query)).toBe(true);
  });

  it("should match frontmatter with equals", () => {
    const query: WorkspaceQuery = {
      operator: "AND",
      rules: [{ field: "frontmatter.status", condition: "equals", value: "active" }],
    };
    expect(evaluateQuery(mockFile, query)).toBe(true);
  });

  it("should match modifiedAt with after-days", () => {
    const query: WorkspaceQuery = {
      operator: "AND",
      rules: [{ field: "modifiedAt", condition: "after-days", value: 1 }],
    };
    expect(evaluateQuery(mockFile, query)).toBe(true);
  });

  it("should not match modifiedAt with before-days if too recent", () => {
    const query: WorkspaceQuery = {
      operator: "AND",
      rules: [{ field: "modifiedAt", condition: "before-days", value: 1 }],
    };
    expect(evaluateQuery(mockFile, query)).toBe(false);
  });

  it("should handle OR operator", () => {
    const query: WorkspaceQuery = {
      operator: "OR",
      rules: [
        { field: "tags", condition: "includes", value: "#nonexistent" },
        { field: "frontmatter.priority", condition: "equals", value: "high" },
      ],
    };
    expect(evaluateQuery(mockFile, query)).toBe(true);
  });

  it("should handle complex AND queries", () => {
    const query: WorkspaceQuery = {
      operator: "AND",
      rules: [
        { field: "wordCount", condition: "equals", value: 100 },
        { field: "frontmatter.status", condition: "equals", value: "active" },
      ],
    };
    expect(evaluateQuery(mockFile, query)).toBe(true);
  });
});
