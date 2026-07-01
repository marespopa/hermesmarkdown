"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseVoiceSegment,
  initialVoiceListState,
  type VoiceInsertion,
  type VoiceListState,
} from "../utils/voice-command-parser";

export type VoiceInputError = "permission-denied" | "network" | "no-microphone" | null;

// Errors that are expected to occur transiently during continuous dictation
// (e.g. a brief silence) — anything else is treated as fatal so a persistent
// error can't cause onend to restart recognition in an infinite loop.
const TRANSIENT_RECOGNITION_ERRORS = new Set(["no-speech", "aborted"]);

// Chrome's continuous-mode SpeechRecognition frequently marks a
// still-in-progress utterance as "final" more than once — emitting a growing
// or self-corrected prefix (e.g. "why" → "why is" → "why is the") as a
// sequence of distinct final results instead of one true final at the actual
// pause, and the gap between those re-finalizations isn't reliably short, so
// a fixed debounce window can't be trusted to catch them all. Instead, each
// new final is compared against the raw text of the last *committed* final:
// if one is a prefix of the other, it's treated as a refinement of the same
// utterance and replaces it in the document instead of stacking after it.
// Bounded by this window so a genuinely unrelated later phrase that happens
// to share a prefix (rare, but possible) isn't clobbered.
const CONTINUATION_WINDOW_MS = 15000;

// Separately, an exact-duplicate final (the literal replay-tail glitch, not
// a growing/corrected refinement) is only ever a same-instant browser artifact
// — it fires within a couple hundred ms of the original. This window has to
// stay short: a user legitimately repeating a short command like "new line"
// a few seconds apart is common and must not be silently swallowed.
const EXACT_DUPLICATE_WINDOW_MS = 1500;

interface UseVoiceInputProps {
  onInsertion: (insertion: VoiceInsertion) => void;
  /**
   * Fired on every interim (not-yet-final) speech result so the caller can
   * show a live "ghost text" preview as the user speaks. `null` means the
   * in-progress utterance was finalized (or cleared) and any preview text
   * should be removed.
   */
  onInterimTranscript?: (transcript: string | null) => void;
  /** Voice input stops listening automatically when the pane is not active. */
  isActivePane?: boolean;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useVoiceInput({ onInsertion, onInterimTranscript, isActivePane = true }: UseVoiceInputProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<VoiceInputError>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listStateRef = useRef(initialVoiceListState);
  // `stateBefore` is the grammar state as it was *before* the previous
  // commit, so a growing/corrected refinement of the same utterance can be
  // re-parsed from that same starting point instead of the state the first
  // (now-superseded) fragment already advanced past.
  const lastCommittedRef = useRef<{ raw: string; at: number; stateBefore: VoiceListState } | null>(null);
  // Tracks whether stop() was user-initiated so onend doesn't auto-restart it.
  const shouldRestartRef = useRef(false);
  const onInsertionRef = useRef(onInsertion);
  onInsertionRef.current = onInsertion;
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  onInterimTranscriptRef.current = onInterimTranscript;

  useEffect(() => {
    setIsSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    onInterimTranscriptRef.current?.(null);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    setError(null);
    listStateRef.current = initialVoiceListState;
    lastCommittedRef.current = null;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = typeof navigator !== "undefined" ? navigator.language : "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (!result.isFinal) {
          onInterimTranscriptRef.current?.(transcript);
          continue;
        }
        onInterimTranscriptRef.current?.(null);

        const normalized = transcript.trim().toLowerCase();
        if (!normalized) continue;

        const last = lastCommittedRef.current;
        const now = Date.now();
        const lastNormalized = last?.raw.trim().toLowerCase() ?? "";
        const isExactDuplicate = !!last && now - last.at < EXACT_DUPLICATE_WINDOW_MS && normalized === lastNormalized;
        if (isExactDuplicate) continue;

        const withinContinuationWindow = !!last && now - last.at < CONTINUATION_WINDOW_MS;
        const isContinuation =
          withinContinuationWindow &&
          lastNormalized.length > 0 &&
          normalized !== lastNormalized &&
          (normalized.startsWith(lastNormalized) || lastNormalized.startsWith(normalized));

        const parseFromState = isContinuation && last ? last.stateBefore : listStateRef.current;
        lastCommittedRef.current = { raw: transcript, at: now, stateBefore: parseFromState };

        const { insertion, nextState } = parseVoiceSegment(transcript, parseFromState);
        listStateRef.current = nextState;
        if (isContinuation && (insertion.kind === "markdown" || insertion.kind === "plain-text")) {
          onInsertionRef.current({ ...insertion, replacePrevious: true });
        } else {
          onInsertionRef.current(insertion);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (TRANSIENT_RECOGNITION_ERRORS.has(event.error)) {
        // Let onend decide whether to restart.
        return;
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("permission-denied");
      } else if (event.error === "network") {
        setError("network");
      } else if (event.error === "audio-capture") {
        setError("no-microphone");
      }
      // Any other error is treated as fatal too, so a persistent error can't
      // trigger an endless restart loop from onend.
      shouldRestartRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        recognition.start();
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;
    recognition.start();
    setIsListening(true);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  // Stop listening when the pane loses focus, the tab goes to background, or
  // the component unmounts — a background mic should never keep recording.
  useEffect(() => {
    if (!isActivePane) stopListening();
  }, [isActivePane, stopListening]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) stopListening();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [stopListening]);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  return { isSupported, isListening, error, toggleListening };
}
