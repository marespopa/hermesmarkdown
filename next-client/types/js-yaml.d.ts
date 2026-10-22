// js-yaml ships no types; only `load` is used (editor/codemirror/markdown-problems.ts).
declare module "js-yaml" {
  export function load(source: string): unknown;
}
