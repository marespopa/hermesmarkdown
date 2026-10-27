import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/Toastr", () => ({ showErrorToast: vi.fn() }));

import type { FileMetadata } from "@/app/atoms/metadata";
import { describeFile } from "./chat-helpers";

describe("describeFile", () => {
  const note = (frontmatter: Record<string, unknown>, tags: string[] = []) =>
    ({ path: "Plans/Roadmap.md", name: "Roadmap.md", tags, frontmatter }) as unknown as FileMetadata;

  it("lists aliases and the description after the title and tags", () => {
    expect(describeFile(note({ title: "Roadmap", aliases: "Plan, Q4", description: "What ships this quarter." }, ["work"]))).toBe(
      "- Plans/Roadmap.md: Roadmap [work] (aka Plan, Q4) — What ships this quarter.",
    );
  });

  it("keeps a note without them to path, title and tags", () => {
    expect(describeFile(note({}))).toBe("- Plans/Roadmap.md: Roadmap");
  });

  it("leaves out a private note's aliases and description", () => {
    expect(describeFile(note({ private: "true", aliases: "Secret", description: "Hidden." }))).toBe("- Plans/Roadmap.md: Roadmap");
  });
});
