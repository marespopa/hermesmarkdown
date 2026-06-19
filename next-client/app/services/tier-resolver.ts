import { VaultIndexEntry } from "./vault-index-reader";

// Implements the three-tier agent load protocol documented in
// vault-setup.ts (_agent-context.md "Context Loading Protocol") as a pure,
// explainable function. No embeddings/fuzzy ranking — every decision must
// trace back to a human-readable reason for the CLI's `reason` column.

export type Tier = "skip" | "scope-only" | "full";

export interface TierResolution {
  tier: Tier;
  reason: string;
}

const KEYWORDS_PREFIX = /^keywords:\s*/i;

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
}

function matchesKeywords(entry: string, query: string): string | null {
  const keywordList = entry.replace(KEYWORDS_PREFIX, "").split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  const queryLower = query.toLowerCase();
  const hit = keywordList.find((k) => k && queryLower.includes(k));
  return hit ?? null;
}

function matchesSentence(entry: string, query: string): boolean {
  const entryWords = new Set(wordsOf(entry));
  const queryWords = wordsOf(query);
  return queryWords.some((w) => entryWords.has(w));
}

function matchReadWhen(readWhen: string[], query: string): { matched: boolean; via: string | null } {
  for (const raw of readWhen) {
    const entry = raw.trim();
    if (!entry || entry.toLowerCase() === "always" || entry.toLowerCase() === "never") continue;

    if (KEYWORDS_PREFIX.test(entry)) {
      if (!query) continue;
      const hit = matchesKeywords(entry, query);
      if (hit) return { matched: true, via: `keyword "${hit}" in read_when "${entry}"` };
    } else if (query && matchesSentence(entry, query)) {
      return { matched: true, via: `query overlaps read_when "${entry}"` };
    }
  }
  return { matched: false, via: null };
}

export function resolveTier(entry: VaultIndexEntry, query: string): TierResolution {
  const readWhenLower = entry.read_when.map((r) => r.trim().toLowerCase());

  if (readWhenLower.includes("never")) {
    return { tier: "skip", reason: "read_when: never — skip unconditionally" };
  }

  if (entry.read_when.length === 0) {
    return { tier: "skip", reason: "no read_when set, defaulted to skip" };
  }

  let matched = false;
  let via = "";

  if (readWhenLower.includes("always")) {
    matched = true;
    via = `read_when: always`;
  } else {
    const result = matchReadWhen(entry.read_when, query);
    matched = result.matched;
    via = result.via ?? "";
  }

  if (!matched) {
    return {
      tier: "skip",
      reason: query
        ? `read_when did not match query "${query}" — skip`
        : "no query provided to match read_when against — skip",
    };
  }

  if (entry.scope) {
    return { tier: "scope-only", reason: `matched ${via}; scope present — load scope only` };
  }

  return { tier: "full", reason: `matched ${via}; no scope field — must load full content` };
}
