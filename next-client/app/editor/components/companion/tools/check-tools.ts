import { LanguageDescription, LRLanguage } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { markdownLanguage } from "@codemirror/lang-markdown";
import type { Tree } from "@lezer/common";
import { frontmatterProblem } from "@/app/editor/codemirror/markdown-problems";
import type { YamlLoad } from "@/app/utils/load-yaml";
import { isMarkdownPath } from "@/app/utils/file-kinds";

// check_file's checks: a quick syntax pass over one file, so the companion
// can catch its own slips without a shell. JSON and YAML are parsed, code
// files go through the editor's own language parsers (a syntax error is a
// parse error node), a note's frontmatter, code fences, [[links]] and fenced
// code are checked. Syntax only: types, imports and behaviour need the
// user's tests.

export const MAX_CHECK_BYTES = 500_000;
const MAX_PROBLEMS = 12;

export interface CheckDeps {
  load: YamlLoad;
  /** Does a [[wiki link]] name resolve to a file in the vault? */
  linkExists: (name: string) => boolean;
}

const lineOf = (text: string, pos: number) => text.slice(0, pos).split("\n").length;
const snippet = (text: string, line: number) => (text.split("\n")[line - 1] ?? "").trim().slice(0, 80);
const problem = (text: string, line: number, what: string) => `line ${line}: ${what} (${snippet(text, line)})`;

// The lines where a tree has error nodes (the first of each run).
function treeProblems(tree: Tree, text: string, firstLine = 1): string[] {
  const found: string[] = [];
  let last = -1;
  tree.iterate({
    enter(node) {
      if (!node.type.isError || found.length >= MAX_PROBLEMS) return;
      const line = lineOf(text, node.from);
      if (line !== last) found.push(problem(text, line + firstLine - 1, "syntax error"));
      last = line;
    },
  });
  return found;
}

async function codeProblems(text: string, fileName: string): Promise<string[] | "no checker"> {
  const description = LanguageDescription.matchFilename(languages, fileName);
  if (!description) return "no checker";
  const { language } = await description.load();
  // Stream-based languages (shell, TOML, …) never report errors.
  if (!(language instanceof LRLanguage)) return "no checker";
  return treeProblems(language.parser.parse(text), text);
}

function jsonProblems(text: string): string[] {
  try {
    JSON.parse(text);
    return [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Engines word this differently: a position, a line and column, or neither.
    const at = /position (\d+)/.exec(message);
    const atLine = /line (\d+)/.exec(message);
    const line = at ? lineOf(text, Number(at[1])) : atLine ? Number(atLine[1]) : 0;
    const what = message.replace(/ in JSON at position \d+.*$/, "").split("\n")[0].slice(0, 120);
    return [line ? problem(text, line, what) : `invalid JSON: ${what}`];
  }
}

function yamlProblems(text: string, load: YamlLoad): string[] {
  try {
    load(text);
    return [];
  } catch (err) {
    const { mark, reason } = err as { mark?: { line?: number }; reason?: string };
    return [problem(text, (mark?.line ?? 0) + 1, `invalid YAML: ${reason || "syntax error"}`)];
  }
}

// Text outside fenced and inline code, same length (so offsets still match).
const withoutCode = (text: string) => text
  .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n\1[ \t]*$|$(?![\s\S]))/gm, (block) => block.replace(/[^\n]/g, " "))
  .replace(/`[^`\n]*`/g, (code) => " ".repeat(code.length));

async function noteProblems(text: string, { load, linkExists }: CheckDeps): Promise<string[]> {
  const found: string[] = [];
  const front = frontmatterProblem(text, load);
  if (front) found.push(`line ${front.line}: ${front.message}`);
  const tree = markdownLanguage.parser.parse(text);
  const fenced: { lang: string; from: number; to: number }[] = [];
  tree.iterate({
    enter(node) {
      if (node.name !== "FencedCode") return;
      const marks = node.node.getChildren("CodeMark").length;
      if (marks < 2) found.push(`line ${lineOf(text, node.from)}: the code block is never closed, so the rest of the file reads as code`);
      const info = node.node.getChild("CodeInfo");
      const body = node.node.getChild("CodeText");
      if (info && body && marks >= 2) fenced.push({ lang: text.slice(info.from, info.to).trim(), from: body.from, to: body.to });
      return false;
    },
  });
  const clean = withoutCode(text);
  for (const match of clean.matchAll(/(?<!!)\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?(?:\|[^\]\n]*)?\]\]/g)) {
    const name = match[1].trim();
    if (name && !linkExists(name)) found.push(`line ${lineOf(text, match.index)}: [[${name}]] doesn't match any file`);
  }
  for (const block of fenced) {
    const description = LanguageDescription.matchLanguageName(languages, block.lang, true);
    if (!description || found.length >= MAX_PROBLEMS) continue;
    const { language } = await description.load();
    if (!(language instanceof LRLanguage)) continue;
    const code = text.slice(block.from, block.to);
    found.push(...treeProblems(language.parser.parse(code), code, lineOf(text, block.from)).map((p) => `${p} in a ${block.lang} code block`));
  }
  return found.slice(0, MAX_PROBLEMS);
}

// check_file's answer for one file's text.
export async function checkFileOutput(path: string, text: string, deps: CheckDeps): Promise<string> {
  if (text.length > MAX_CHECK_BYTES) return `${path} is too large to check (over ${MAX_CHECK_BYTES / 1000} KB).`;
  const name = path.slice(path.lastIndexOf("/") + 1);
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";
  let problems: string[] | "no checker";
  try {
    if (isMarkdownPath(path)) problems = await noteProblems(text, deps);
    else if (ext === "json") problems = jsonProblems(text);
    else if (ext === "yaml" || ext === "yml") problems = yamlProblems(text, deps.load);
    else problems = await codeProblems(text, name);
  } catch (err) {
    return `Couldn't check ${path}: ${err instanceof Error ? err.message : String(err)}.`;
  }
  if (problems === "no checker") return `There is no syntax checker for ${name}. Read it again to check it by eye; the user can run its tools.`;
  if (!problems.length) return `${path}: no syntax problems found. This checks syntax only, not types, imports or behaviour; the user's tests and build do that.`;
  return `${path}: ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n${problems.map((p) => `- ${p}`).join("\n")}`;
}
