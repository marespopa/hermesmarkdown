import { describe, it, expect } from "vitest";
import { computeVaultHealth } from "./vaultHealth";
import { parseFmFields } from "./frontmatter-utils";
import { computeTokenEstimate } from "./tokenEstimate";
import { FileMetadata } from "@/app/atoms/metadata";
import { VaultIndex } from "@/app/services/vault-index-reader";
import { STARTER_PACKS } from "@/app/services/starter-packs";

const REGEX_TAG = /(?<=^|\s)#(?=[a-zA-Z0-9_\-/]*[a-zA-Z])([a-zA-Z0-9_\-/]+)/g;
const REGEX_LINK = /\[\[(.*?)\]\]/g;
const REGEX_FRONTMATTER = /^---\n([\s\S]*?)\n---/;

function parseFrontmatterTags(fmContent: string): string[] {
  const inlineMatch = fmContent.match(/^tags:\s*\[(.*?)\]/m);
  if (!inlineMatch) return [];
  return inlineMatch[1]
    .split(",")
    .map((t) => t.trim().replace(/^["']|["']$/g, "").toLowerCase())
    .filter(Boolean);
}

// Mirrors app/workers/metadata.worker.ts's per-file parsing, without the
// worker/message-passing scaffolding, so pack content can be exercised
// directly against computeVaultHealth in a unit test.
function toFileMetadata(path: string, name: string, content: string): FileMetadata {
  const fmMatch = content.match(REGEX_FRONTMATTER);
  const frontmatter: Record<string, any> = fmMatch ? parseFmFields(content) : {};

  const fmTags = fmMatch ? parseFrontmatterTags(fmMatch[1]) : [];
  const bodyContent = fmMatch ? content.slice(fmMatch[0].length) : content;
  const inlineTags = Array.from(bodyContent.matchAll(REGEX_TAG)).map((m) => m[1].toLowerCase());
  const tags = Array.from(new Set([...fmTags, ...inlineTags]));

  const linkMatches = Array.from(content.matchAll(REGEX_LINK));
  const links = Array.from(new Set(linkMatches.map((m) => m[1].trim())));

  return {
    path,
    name,
    tags,
    links,
    frontmatter,
    modifiedAt: Date.now(),
    wordCount: content.trim().split(/\s+/).filter(Boolean).length,
    tasks: [],
    handle: null,
    tokens: computeTokenEstimate(content),
    agentScore: null,
  };
}

describe("computeVaultHealth on starter packs", () => {
  for (const pack of STARTER_PACKS) {
    if (pack.files.length === 0) continue;

    it(`scores 100/100 across all pillars for the "${pack.id}" pack`, () => {
      const fileMetadata: Record<string, FileMetadata> = {};
      for (const f of pack.files) {
        if (f.path.startsWith(".hermes/")) continue;
        const name = f.path.split("/").pop()!;
        fileMetadata[f.path] = toFileMetadata(f.path, name, f.content);
      }

      // Simulate a just-regenerated index — the app auto-rewrites
      // .hermes/index.yaml after every metadata scan, so a freshly
      // installed pack has a matching index by the time it's viewed.
      const vaultIndex: VaultIndex = {
        version: 1,
        generated: new Date().toISOString(),
        entries: Object.values(fileMetadata).map((f) => ({
          path: f.path,
          title: f.frontmatter.title ?? null,
          status: f.frontmatter.status ?? null,
          scope: f.frontmatter.scope ?? null,
          read_when: [],
          related: [],
          tags: f.tags,
        })),
        tasks: { prog: [], todo: [] },
      };

      const result = computeVaultHealth(fileMetadata, vaultIndex);

      for (const pillar of result.pillars) {
        expect(pillar.score, `${pillar.pillar}: ${pillar.metrics.map((m) => m.reason).join("; ")}`).toBe(100);
      }
      expect(result.composite).toBe(100);
    });
  }
});
