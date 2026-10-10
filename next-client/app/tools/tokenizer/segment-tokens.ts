// Pure helpers for the tokenizer tool, shared by its worker and tests.

export interface TokenSegment {
  text: string;
  // Usually one id. An emoji or a CJK character can span several tokens,
  // each holding part of its UTF-8 bytes; those share one segment.
  ids: number[];
}

// How many tokens the view highlights. Counting covers all of them; drawing
// one span per token past this would only slow the page down.
export const MAX_VISIBLE_TOKENS = 5_000;
// Longest run of tokens merged while waiting for a character to complete.
const MAX_GROUP = 8;
const REPLACEMENT = "�";

// Splits token ids into displayable segments, decoding at most `limit`
// tokens. A token that decodes to nothing or to a dangling replacement
// character holds a partial character, so it joins the next one.
export function segmentTokens(
  ids: readonly number[],
  decode: (ids: number[]) => string,
  limit = MAX_VISIBLE_TOKENS,
): TokenSegment[] {
  const segments: TokenSegment[] = [];
  let group: number[] = [];
  const end = Math.min(ids.length, limit);
  for (let i = 0; i < end; i++) {
    group.push(ids[i]);
    const text = decode(group);
    const incomplete = text === "" || text.endsWith(REPLACEMENT);
    if (incomplete && group.length < MAX_GROUP && i < end - 1) continue;
    segments.push({ text, ids: group });
    group = [];
  }
  return segments;
}

export interface TextStats {
  characters: number;
  words: number;
}

// Characters by code point (a plain emoji is one), and words as runs of
// non-space text.
export function textStats(text: string): TextStats {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { characters: Array.from(text).length, words };
}
