import { EMOJI_SHORTCODES, SHORTCODES } from "../components/constants";

// [emoji, CLDR name in snake_case, space-separated aliases and keywords], as
// scripts/generate-emoji-data.mjs writes emoji-data.json.
export type EmojiRow = [emoji: string, name: string, words: string];

export interface EmojiEntry {
  /** Position in the index, for per-entry caches (emoji-completion.ts). */
  index: number;
  name: string;
  emoji: string;
  /** Aliases and keywords, lowercase, each after a space: " +1 good like". */
  words: string;
}

const bare = (emoji: string) => emoji.replace(/[️\s]/g, "");

// The curated EMOJI_SHORTCODES first (with the full list's keywords for the
// same emoji, so 🔥 `fire` is found by "flame" too), then the full list
// without those emojis or names, nor a name another shortcode uses (`{date}`).
export function buildEmojiIndex(rows: EmojiRow[]): EmojiEntry[] {
  const wordsByEmoji = new Map(rows.map(([emoji, name, words]) => [bare(emoji), `${name} ${words}`]));
  const curated = Object.entries(EMOJI_SHORTCODES).map(([name, emoji]) => ({
    name,
    emoji,
    words: wordsByEmoji.get(bare(emoji)) ?? "",
  }));
  const taken = new Set(curated.flatMap(({ name, emoji }) => [name, bare(emoji)]));
  const rest = rows
    .filter(([emoji, name]) => !taken.has(name) && !taken.has(bare(emoji)) && !(`{${name}}` in SHORTCODES))
    .map(([emoji, name, words]) => ({ name, emoji, words }));
  return [...curated, ...rest].map((entry, index) => ({ ...entry, index, words: ` ${entry.words.toLowerCase()}` }));
}

// The entries `query` finds, best first: the exact name, names starting with
// it, names with a later word starting with it (`up` → thumbs_up), an alias
// or keyword starting with it (`flame` → fire), then names containing it;
// the index's own order within each. One pass, no sorting.
export function matchEmojis(entries: EmojiEntry[], query: string): EmojiEntry[] {
  const q = query.toLowerCase();
  if (q === "") return entries;
  const wordStart = `_${q}`;
  const keywordStart = ` ${q.replace(/_/g, " ")}`;
  const tiers: EmojiEntry[][] = [[], [], [], [], []];
  for (const entry of entries) {
    const { name } = entry;
    if (name === q) tiers[0].push(entry);
    else if (name.startsWith(q)) tiers[1].push(entry);
    else if (name.includes(wordStart)) tiers[2].push(entry);
    else if (entry.words.includes(keywordStart)) tiers[3].push(entry);
    else if (name.includes(q)) tiers[4].push(entry);
  }
  return tiers.flat();
}

let entries: EmojiEntry[] | null = null;
let byName: Map<string, string> | null = null;
let loading: Promise<EmojiEntry[]> | null = null;

// The index, loaded once, on first use, in a chunk of its own: about 1,900
// emojis the editor doesn't need until an emoji menu opens.
export function loadEmojiIndex(): Promise<EmojiEntry[]> {
  loading ??= import("./emoji-data.json").then((module) => {
    entries = buildEmojiIndex(module.default as EmojiRow[]);
    return entries;
  });
  return loading;
}

/** The index if it has loaded, else null (and it starts loading). */
export function loadedEmojiIndex(): EmojiEntry[] | null {
  if (!entries) void loadEmojiIndex();
  return entries;
}

/** The emoji named `name` (`thumbs_up`), once the index has loaded. */
export function emojiByName(name: string): string | undefined {
  const index = loadedEmojiIndex();
  if (!index) return undefined;
  byName ??= new Map(index.map((entry) => [entry.name, entry.emoji]));
  return byName.get(name.toLowerCase());
}
