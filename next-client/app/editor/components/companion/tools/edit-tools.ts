import { codeBlocks } from "./read-tools";

// The pure half of the companion's edit tools (edit_file, edit_code_block):
// the new text of a file, or why the edit can't be made. A failed edit
// changes nothing, and its reason goes back to the model so it can read
// the file again and retry.

export type EditResult = { ok: true; text: string; summary: string } | { ok: false; reason: string };

export interface FindReplace {
  find: string;
  replace: string;
}

const countOf = (text: string, needle: string) => {
  let count = 0;
  for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + needle.length)) count++;
  return count;
};

// Applies each edit in order; each `find` must match exactly once in the
// text as the earlier edits left it.
export function applyEdits(text: string, edits: FindReplace[]): EditResult {
  if (!edits.length) return { ok: false, reason: "No edits given." };
  let next = text;
  for (const [i, { find, replace }] of edits.entries()) {
    if (!find) return { ok: false, reason: `Edit ${i + 1} has an empty find. Quote the exact text to change.` };
    const count = countOf(next, find);
    if (count !== 1) {
      return {
        ok: false,
        reason: count === 0
          ? `Edit ${i + 1}: the find text matches 0 times. Read the file again and quote it exactly, whitespace included. Nothing was changed.`
          : `Edit ${i + 1}: the find text matches ${count} times. Quote more of the surrounding text so it matches once. Nothing was changed.`,
      };
    }
    const at = next.indexOf(find);
    next = next.slice(0, at) + replace + next.slice(at + find.length);
  }
  if (next === text) return { ok: false, reason: "The edits leave the file as it is. Nothing was changed." };
  return { ok: true, text: next, summary: `${edits.length} edit${edits.length === 1 ? "" : "s"}` };
}

export interface CodeBlockTarget {
  index?: number;
  lang?: string;
  firstLine?: string;
}

// Replaces the code inside one fenced block, picked by its index or by its
// language and first line; the fences stay as they are.
export function replaceCodeBlock(doc: string, target: CodeBlockTarget, code: string): EditResult {
  const blocks = codeBlocks(doc);
  if (!blocks.length) return { ok: false, reason: "The note has no fenced code blocks." };
  let matches = blocks;
  if (target.index !== undefined) matches = blocks.filter((block) => block.index === target.index);
  else {
    if (target.lang) matches = matches.filter((block) => block.lang.toLowerCase() === target.lang!.toLowerCase());
    if (target.firstLine) matches = matches.filter((block) => block.code.split("\n")[0].trim() === target.firstLine!.trim());
  }
  if (matches.length !== 1) {
    return {
      ok: false,
      reason: `${matches.length === 0 ? "No" : matches.length} code block${matches.length === 1 ? "" : "s"} match; the note has ${blocks.length} (index 0–${blocks.length - 1}). Pick one by index. Nothing was changed.`,
    };
  }
  const block = matches[0];
  const lines = doc.slice(block.from, block.to).split("\n");
  const body = code.replace(/\n$/, "");
  const replaced = [lines[0], ...(body ? body.split("\n") : []), lines[lines.length - 1]].join("\n");
  const next = doc.slice(0, block.from) + replaced + doc.slice(block.to);
  if (next === doc) return { ok: false, reason: "The code is already that. Nothing was changed." };
  return { ok: true, text: next, summary: `code block ${block.index}` };
}
