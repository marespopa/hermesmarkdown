import type { TokenizerEncoding } from "@/app/atoms/tool-atoms";
import type { TokenSegment } from "@/app/tools/tokenizer/segment-tokens";

// Messages between the tokenizer tool and tokenizer.worker.ts.

export interface TokenizeRequest {
  id: number;
  text: string;
  encoding: TokenizerEncoding;
  // Only the count: no segments (the token cost views).
  countOnly?: boolean;
}

export type TokenizeResponse =
  | { id: number; ok: true; tokenCount: number; segments: TokenSegment[]; truncated: boolean }
  | { id: number; ok: false; error: string };
