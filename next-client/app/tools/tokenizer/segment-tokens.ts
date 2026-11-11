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

// Scripts written without spaces between words: a run of these is split with
// the browser's word segmenter, since whitespace alone would call a whole
// sentence one word.
const UNSPACED_SCRIPT = /[฀-๿぀-ヿ㐀-鿿]/;

function wordsInRun(run: string): number {
  if (!UNSPACED_SCRIPT.test(run) || typeof Intl.Segmenter !== "function") return 1;
  let count = 0;
  for (const part of new Intl.Segmenter(undefined, { granularity: "word" }).segment(run)) {
    if (part.isWordLike) count++;
  }
  return Math.max(count, 1);
}

// Characters by code point (a plain emoji is one), and words as runs of
// non-space text, with runs in Chinese, Japanese or Thai split into words.
export function textStats(text: string): TextStats {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).reduce((sum, run) => sum + wordsInRun(run), 0) : 0;
  return { characters: Array.from(text).length, words };
}
