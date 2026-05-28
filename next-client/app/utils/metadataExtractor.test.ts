import { describe, it, expect } from "vitest";
import { extractMetadata } from "./metadataExtractor";

describe("metadataExtractor", () => {
  it("should extract tags", () => {
    const content = "Hello #world and #todo-list. But not # Heading.";
    const meta = extractMetadata(content);
    expect(meta.tags).toContain("world");
    expect(meta.tags).toContain("todo-list");
    // The regex extracts the word after #. For "# Heading", it won't match because of the space.
    // If it was "#Heading", it would match "heading".
  });

  it("should not extract heading as tag", () => {
    const content = "# Heading\n#SecondHeading\n# tag";
    const meta = extractMetadata(content);
    expect(meta.tags).not.toContain("heading");
    expect(meta.tags).toContain("secondheading");
    expect(meta.tags).not.toContain("tag");
  });

  it("should extract tags with slashes and underscores", () => {
    const content = "Project #work/client_a and #urgent!";
    const meta = extractMetadata(content);
    expect(meta.tags).toContain("work/client_a");
    expect(meta.tags).toContain("urgent");
  });

  it("should extract frontmatter", () => {
    const content = "---\ntitle: My Page\nstatus: active\n---\nBody";
    const meta = extractMetadata(content);
    expect(meta.frontmatter.title).toBe("My Page");
    expect(meta.frontmatter.status).toBe("active");
  });

  it("should count words", () => {
    const content = "One two three four.";
    const meta = extractMetadata(content);
    expect(meta.wordCount).toBe(4);
  });
});
