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
  // True until the first result for the current encoding arrives (the
  // vocabulary is still downloading).
  loading: boolean;
  error: string | null;
}

// Tokenizes `text` in tokenizer.worker.ts, 120 ms after the last change.
// Replies to older requests are dropped, so a slow one never overwrites a
// newer result.
export function useTokenizer(text: string, encoding: TokenizerEncoding, delayMs = 120): TokenizerState {
  const workerRef = useRef<Worker | null>(null);
  const latestRef = useRef(0);
  const [state, setState] = useState<TokenizerState>({ result: null, loading: true, error: null });

  useEffect(() => {
    const worker = new Worker(new URL("../../workers/tokenizer.worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<TokenizeResponse>) => {
      const response = event.data;
      if (response.id !== latestRef.current) return;
      setState(
        response.ok
          ? { result: response, loading: false, error: null }
          : { result: null, loading: false, error: response.error },
      );
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const id = ++latestRef.current;
    const timer = setTimeout(() => {
      const request: TokenizeRequest = { id, text, encoding };
      workerRef.current?.postMessage(request);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [text, encoding, delayMs]);

  return state;
}
