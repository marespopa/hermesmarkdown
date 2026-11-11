"use client";

import { useEffect, useRef, useState } from "react";
import type { TokenizerEncoding } from "@/app/atoms/tool-atoms";
import type { TokenizeRequest, TokenizeResponse } from "@/app/workers/tokenizer-protocol";
import type { TokenSegment } from "./segment-tokens";

export interface TokenizeResult {
  tokenCount: number;
  segments: TokenSegment[];
  truncated: boolean;
}

export interface TokenizerState {
  result: TokenizeResult | null;
  // True until the first result arrives (the vocabulary is still
  // downloading).
  loading: boolean;
  // The last failure. A failed request keeps the previous `result`, so the
  // view never goes blank.
  error: string | null;
  // The encoding `result` was counted with; it differs from the requested one
  // while a new vocabulary loads, and after a failed switch.
  resultEncoding?: TokenizerEncoding | null;
  // True while `result` is for older text or another encoding than the one
  // asked for: show it dimmed, with a (delayed) pending mark.
  stale?: boolean;
}

interface Answer {
  text: string;
  encoding: TokenizerEncoding;
}

interface Options {
  delayMs?: number;
  countOnly?: boolean;
  // false skips tokenizing and keeps the last state.
  enabled?: boolean;
}

// Tokenizes `text` in tokenizer.worker.ts, 120 ms after the last change.
// Replies to older requests are dropped, so a slow one never overwrites a
// newer result, and the previous result stays on screen until the new one
// arrives. With `countOnly`, results carry no segments.
export function useTokenizer(
  text: string,
  encoding: TokenizerEncoding,
  { delayMs = 120, countOnly = false, enabled = true }: Options = {},
): TokenizerState {
  const workerRef = useRef<Worker | null>(null);
  const latestRef = useRef(0);
  const asked = useRef<Answer>({ text, encoding });
  const [state, setState] = useState<{
    result: TokenizeResult | null;
    answered: Answer | null;
    loading: boolean;
    error: string | null;
  }>({ result: null, answered: null, loading: true, error: null });

  useEffect(() => {
    const worker = new Worker(new URL("../../workers/tokenizer.worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<TokenizeResponse>) => {
      const response = event.data;
      if (response.id !== latestRef.current) return;
      const answered = asked.current;
      setState((previous) =>
        response.ok
          ? { result: response, answered, loading: false, error: null }
          : { ...previous, loading: false, error: response.error },
      );
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = ++latestRef.current;
    asked.current = { text, encoding };
    const timer = setTimeout(() => {
      const request: TokenizeRequest = { id, text, encoding, countOnly };
      workerRef.current?.postMessage(request);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [text, encoding, delayMs, countOnly, enabled]);

  const { answered, error } = state;
  const stale = enabled && !error && !!answered && (answered.text !== text || answered.encoding !== encoding);
  return {
    result: state.result,
    loading: state.loading,
    error,
    resultEncoding: answered?.encoding ?? null,
    stale,
  };
}
