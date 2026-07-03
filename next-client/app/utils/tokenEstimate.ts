// Token cost estimate for the three-tier context load model (see
// vault-setup.ts's Context Loading Protocol / tier-resolver.ts):
// Tier 0 (skip) reads only `read_when`, Tier 1 (scope-only) adds `scope`,
// Tier 2 (full) is the whole file. Uses a real BPE tokenizer (cl100k, via
// gpt-tokenizer) rather than a chars/4 heuristic — approximate across
// providers, but credible for an engineer audience.
import { encode } from "gpt-tokenizer";
import { parseFmFields } from "./frontmatter-utils";

export interface TokenEstimate {
  readWhen: number;
  scoped: number;
  full: number;
}

export function computeTokenEstimate(content: string): TokenEstimate {
  const fields = parseFmFields(content);
  const readWhenText = fields.read_when ?? "";
  const scopeText = fields.scope ?? "";

  const readWhen = readWhenText ? encode(readWhenText).length : 0;
  const scoped = readWhen + (scopeText ? encode(scopeText).length : 0);
  const full = content ? encode(content).length : 0;

  return { readWhen, scoped, full };
}
