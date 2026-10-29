import { FM_REGEX, parseFmFields } from "@/app/utils/frontmatter-utils";
import type { YamlLoad } from "@/app/utils/load-yaml";
import { localISODate } from "@/app/utils/task-line";
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
  if (!blocks.length) return { ok: false, reason: "The file has no fenced code blocks." };
  let matches = blocks;
  if (target.index !== undefined) matches = blocks.filter((block) => block.index === target.index);
  else {
    if (target.lang) matches = matches.filter((block) => block.lang.toLowerCase() === target.lang!.toLowerCase());
    if (target.firstLine) matches = matches.filter((block) => block.code.split("\n")[0].trim() === target.firstLine!.trim());
  }
  if (matches.length !== 1) {
    return {
      ok: false,
      reason: `${matches.length === 0 ? "No" : matches.length} code block${matches.length === 1 ? "" : "s"} match; the file has ${blocks.length} (index 0–${blocks.length - 1}). Pick one by index. Nothing was changed.`,
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

// A YAML scalar as people write it: bare unless YAML would read it as
// something else (a key, a comment, a list, a flag or a number).
const yamlScalar = (value: string) =>
  /^[\s[\]{}\-?:,&*!|>'"%@`#]|: | #|\s$|^(?:true|false|yes|no|on|off|null|~|[-+.\d][\d._:eE+-]*)$/i.test(value) || !value
    ? JSON.stringify(value)
    : value;

// A new note's text (create_file) with a frontmatter block: the title (from
// the file name) and the day it was made, written as standard YAML (the
// date bare, the title quoted only when it has to be). A block the model
// wrote keeps its fields; only the missing ones are added, before its end.
export function withNewNoteFrontmatter(path: string, content: string, today = localISODate()): string {
  const fields = parseFmFields(content);
  const lines: string[] = [];
  if (!fields.title) lines.push(`title: ${yamlScalar(path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/i, ""))}`);
  if (!fields.created) lines.push(`created: ${today}`);
  if (!lines.length) return content;
  const block = FM_REGEX.exec(content);
  if (!block) return `---\n${lines.join("\n")}\n---\n\n${content.trim() ? `${content.trim()}\n` : ""}`;
  return `---\n${block[1]}\n${lines.join("\n")}\n---\n${content.slice(block[0].length)}`;
}

// Standard fields for plans created by the companion. Callers may supply
// either field to choose a more specific value.
export function withPlanFrontmatter(content: string): string {
  const fields = parseFmFields(content);
  const additions = [
    !fields.type && "type: plan",
    !fields.status && "status: draft",
  ].filter(Boolean).join("\n");
  if (!additions) return content;
  const block = FM_REGEX.exec(content);
  if (!block) return `---\n${additions}\n---\n\n${content.trim() ? `${content.trim()}\n` : ""}`;
  return `---\n${block[1]}\n${additions}\n---\n${content.slice(block[0].length)}`;
}

const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
// Template fields (`{{date}}`) are filled in later and aren't YAML yet.
const TEMPLATE_FIELD = /\{\{[^{}\n]*\}\}/g;
// A top-level `key: value` line with a value on it.
const FIELD = /^([A-Za-z_][\w-]*):[ \t]+(\S.*?)[ \t]*$/;

const parses = (load: YamlLoad, source: string) => {
  try {
    load(source.replace(TEMPLATE_FIELD, "x"));
    return true;
  } catch {
    return false;
  }
};

// Frontmatter the model wrote that isn't valid YAML, made valid where a
// field's value only needed quotes: `title: Plan: phase two` (a second
// ": "), `title: "Q4" plan`. Each top-level line YAML can't read on its own
// gets its whole value quoted, as written. Valid frontmatter, or one that
// quoting doesn't fix, is left as it is.
export function repairFrontmatter(content: string, load: YamlLoad): string {
  const block = FRONTMATTER.exec(content);
  if (!block || parses(load, block[1])) return content;
  const lines = block[1].split(/\r?\n/).map((line) => {
    const field = FIELD.exec(line);
    if (!field || line.includes("{{") || parses(load, line)) return line;
    return `${field[1]}: ${JSON.stringify(field[2])}`;
  });
  const repaired = lines.join("\n");
  if (!parses(load, repaired)) return content;
  return `---\n${repaired}\n---\n${content.slice(block[0].length)}`;
}
