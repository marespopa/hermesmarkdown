import { MAX_VISIBLE_TOKENS, segmentTokens } from "@/app/tools/tokenizer/segment-tokens";
import type { TokenizerEncoding } from "@/app/atoms/tool-atoms";
import type { TokenizeRequest, TokenizeResponse } from "./tokenizer-protocol";

// Tokenizes text for the tokenizer tool (/tools/tokenizer) and the token
// cost views (calculator page, editor dialog), off the main thread: an
// encoding's vocabulary is 1–2.5 MB of script, loaded here only when first
// used, and a long paste never blocks typing.

interface Encoder {
  encode: (text: string, options?: { disallowedSpecial?: Set<string> }) => number[];
  decode: (ids: Iterable<number>) => string;
}

const loaders: Record<TokenizerEncoding, () => Promise<Encoder>> = {
  o200k_base: () => import("gpt-tokenizer/encoding/o200k_base"),
  cl100k_base: () => import("gpt-tokenizer/encoding/cl100k_base"),
};
const NO_SPECIAL_TOKENS = new Set<string>();
const encoders = new Map<TokenizerEncoding, Promise<Encoder>>();

function encoderFor(encoding: TokenizerEncoding) {
  let encoder = encoders.get(encoding);
  if (!encoder) encoders.set(encoding, (encoder = loaders[encoding]()));
  return encoder;
}

self.onmessage = async (event: MessageEvent<TokenizeRequest>) => {
  const { id, text, encoding, countOnly } = event.data;
  let response: TokenizeResponse;
  try {
    const { encode, decode } = await encoderFor(encoding);
    // Special-token markers (<|endoftext|> …) count as plain text, as they
    // would in a prompt; by default the library throws on them.
    const ids = encode(text, { disallowedSpecial: NO_SPECIAL_TOKENS });
    response = {
      id,
      ok: true,
      tokenCount: ids.length,
      segments: countOnly ? [] : segmentTokens(ids, decode),
      truncated: ids.length > MAX_VISIBLE_TOKENS,
    };
  } catch (error) {
    response = { id, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(response);
};
