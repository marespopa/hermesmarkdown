"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseVoiceSegment,
  initialVoiceListState,
  type VoiceInsertion,
} from "../utils/voice-command-parser";

export type VoiceInputError = "permission-denied" | "network" | "no-microphone" | null;

// Errors that are expected to occur transiently during continuous dictation
// (e.g. a brief silence) — anything else is treated as fatal so a persistent
// error can't cause onend to restart recognition in an infinite loop.
const TRANSIENT_RECOGNITION_ERRORS = new Set(["no-speech", "aborted"]);

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
        const { insertion, nextState } = parseVoiceSegment(transcript, listStateRef.current);
        listStateRef.current = nextState;
        onInsertionRef.current(insertion);
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
