// Writes app/editor/codemirror/emoji-data.json, the full emoji list behind
// the `{` / `:` emoji menu (codemirror/emoji-completion.ts), from the Unicode
// CLDR data emojibase publishes — the names Emojipedia lists.
//
//   node scripts/generate-emoji-data.mjs
//
// Each entry is [emoji, name, search words]: the CLDR short name in
// snake_case (`thumbs_up`), then GitHub shortcode aliases (`+1`) and CLDR
// keywords, space-separated. Skin-tone variants and components (skin tones,
// hair styles, regional indicators) are left out.
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://cdn.jsdelivr.net/npm/emojibase-data@16.0.3/en";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../app/editor/codemirror/emoji-data.json");
const COMPONENT_GROUP = 2;

async function load(path) {
  const response = await fetch(`${BASE}/${path}`);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

const list = (value) => (value == null ? [] : Array.isArray(value) ? value : [value]);

const [emojis, cldr, github] = await Promise.all([
  load("compact.json"),
  load("shortcodes/cldr.json"),
  load("shortcodes/github.json"),
]);

const seen = new Set();
const entries = emojis
  .filter((emoji) => emoji.group !== undefined && emoji.group !== COMPONENT_GROUP)
  .sort((a, b) => a.order - b.order)
  .flatMap((emoji) => {
    const [name] = list(cldr[emoji.hexcode]);
    if (!name || seen.has(name)) return [];
    seen.add(name);
    const words = new Set([...list(github[emoji.hexcode]), ...list(emoji.tags)].map((word) => word.toLowerCase()));
    words.delete(name);
    return [[emoji.unicode, name, [...words].join(" ")]];
  });

await writeFile(OUT, `[\n${entries.map((entry) => JSON.stringify(entry)).join(",\n")}\n]\n`);
console.log(`Wrote ${entries.length} emojis to ${OUT}`);
