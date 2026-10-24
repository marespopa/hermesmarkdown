// js-yaml ships no types; only what the app uses is declared: `load` for the
// frontmatter checks (editor/codemirror/markdown-problems.ts), `load` and
// `dump` for the vault's pins file (services/vault-pins.ts).
declare module "js-yaml" {
  export function load(source: string): unknown;
  export function dump(value: unknown, options?: { flowLevel?: number; lineWidth?: number; noRefs?: boolean }): string;
}
