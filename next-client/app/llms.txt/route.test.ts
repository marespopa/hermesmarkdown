// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GROUPS } from "@/app/documentation/content";
import { ALTERNATIVES } from "@/app/alternatives/content";
import { GUIDES } from "@/app/guides/content";
import { SITE_URL, TOOLS, toolPath } from "@/app/tools/content/tools";
import { GET as getLlmsFull } from "../llms-full.txt/route";
import { GET } from "./route";

describe("llms.txt", () => {
  it("is plain text and lists every tool and documentation article", async () => {
    const response = GET();
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    const text = await response.text();
    for (const tool of TOOLS) expect(text).toContain(`${SITE_URL}${toolPath(tool)}`);
    for (const group of GROUPS) {
      for (const item of group.items) expect(text).toContain(`${SITE_URL}/documentation/${item.id}`);
    }
  });

  it("lists every alternative and guide, in both files", async () => {
    for (const text of [await GET().text(), await getLlmsFull().text()]) {
      for (const entry of ALTERNATIVES) expect(text).toContain(`${SITE_URL}/alternatives/${entry.slug}`);
      for (const entry of GUIDES) expect(text).toContain(`${SITE_URL}/guides/${entry.slug}`);
    }
  });

  it("states the browser support", async () => {
    const text = await GET().text();
    expect(text).toContain("File System Access API");
    expect(text).toContain("IndexedDB");
  });

  it("llms-full.txt adds each tool's FAQ", async () => {
    const text = await getLlmsFull().text();
    for (const tool of TOOLS) {
      expect(text).toContain(tool.description);
      for (const { q } of tool.faq) expect(text).toContain(`Q: ${q}`);
    }
  });
});
