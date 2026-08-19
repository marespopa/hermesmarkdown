"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  atom_voiceInputRequest,
  atom_isVoiceInputListening,
  atom_isVoiceInputSupported,
  atom_isVoicePreviewVisible,
} from "@/app/atoms/atoms";
import { atom_activeEditorView } from "@/app/atoms/ui-atoms";
import { useVoiceInput } from "./use-voice-input";
import { joinVoiceChunks, type VoiceInsertion } from "../utils/voice-command-parser";
import { typewriterInsertCM6 } from "../codemirror/typewriter-insert";

// A single shared dictation session for the whole app — instantiated once
// (in page.tsx), not per pane. Switching the active pane mid-dictation must
// not drop the in-progress preview or restart the mic, so neither the
// SpeechRecognition session nor the preview buffer is scoped to any one
// pane's lifecycle. "Insert" writes into whichever CM6 view is currently
// registered as active (see atom_activeEditorView).
export function useGlobalVoiceInput() {
  // Dictated speech accumulates here instead of going straight into the
  // document, so mishears/garbling can be reviewed and hand-edited before
  // anything touches the real text. Only an explicit commit (or discard)
  // resolves it.
  const [voicePreviewText, setVoicePreviewTextState] = useState("");
  const voicePreviewTextRef = useRef("");
  const setVoicePreviewText = useCallback((text: string) => {
    voicePreviewTextRef.current = text;
    setVoicePreviewTextState(text);
    // A manual edit invalidates the assumption that the buffer's tail is
    // exactly what the last recognized segment appended.
    lastVoiceChunkLengthRef.current = null;
  }, []);
  const [voiceInterimText, setVoiceInterimText] = useState<string | null>(null);
  // Length of the most recently appended chunk, so a "replacePrevious"
  // refinement or a "scratch that" can remove exactly that much from the
  // tail of the buffer. Only tracks one level back, not a stack.
  const lastVoiceChunkLengthRef = useRef<number | null>(null);

  const clearVoicePreview = useCallback(() => {
    voicePreviewTextRef.current = "";
    setVoicePreviewTextState("");
    setVoiceInterimText(null);
    lastVoiceChunkLengthRef.current = null;
  }, []);

  // `commitVoicePreview` and `toggleVoiceListening` are both defined further
  // down — the former depends on `clearVoicePreview` and the active textarea
  // atom, the latter comes back out of `useVoiceInput` itself, which takes
  // `handleVoiceInsertion` as an input. Voice commands need to trigger both
  // from inside this callback, so they're kept in refs (refreshed on every
  // render below) rather than reordering all of this hook's interdependent
  // callbacks.
  const commitVoicePreviewRef = useRef<() => void>(() => {});
  const toggleVoiceListeningRef = useRef<() => void>(() => {});
  const isVoiceListeningRef = useRef(false);

  const stopListening = useCallback(() => {
    if (isVoiceListeningRef.current) toggleVoiceListeningRef.current();
  }, []);

  const handleVoiceInsertion = useCallback((insertion: VoiceInsertion) => {
    if (insertion.kind === "none") return;

    if (insertion.kind === "commit") {
      commitVoicePreviewRef.current();
      return;
    }

    if (insertion.kind === "commit-and-stop") {
      commitVoicePreviewRef.current();
      stopListening();
      return;
    }

    if (insertion.kind === "stop-listening") {
      clearVoicePreview();
      stopListening();
      return;
    }

    if (insertion.kind === "clear-all") {
      clearVoicePreview();
      return;
    }

    if (insertion.kind === "delete-last") {
      const chunkLength = lastVoiceChunkLengthRef.current;
      if (!chunkLength) return;
      const next = voicePreviewTextRef.current.slice(0, -chunkLength);
      voicePreviewTextRef.current = next;
      setVoicePreviewTextState(next);
      lastVoiceChunkLengthRef.current = null;
      return;
    }

    if (!insertion.text) return;

    const base =
      insertion.replacePrevious && lastVoiceChunkLengthRef.current
        ? voicePreviewTextRef.current.slice(0, -lastVoiceChunkLengthRef.current)
        : voicePreviewTextRef.current;
    const next = joinVoiceChunks(base, insertion.text);
    voicePreviewTextRef.current = next;
    setVoicePreviewTextState(next);
    lastVoiceChunkLengthRef.current = insertion.text.length;
  }, [clearVoicePreview, stopListening]);

  const handleVoiceInterimTranscript = useCallback((transcript: string | null) => {
    setVoiceInterimText(transcript);
  }, []);

  const {
    isSupported: isVoiceSupported,
    isListening: isVoiceListening,
    error: voiceError,
    toggleListening: toggleVoiceListening,
  } = useVoiceInput({
    onInsertion: handleVoiceInsertion,
    onInterimTranscript: handleVoiceInterimTranscript,
  });
  toggleVoiceListeningRef.current = toggleVoiceListening;
  isVoiceListeningRef.current = isVoiceListening;

  // Starting a fresh listening session discards any leftover unconfirmed
  // preview from before, rather than silently continuing to build on it.
  const wasVoiceListeningRef = useRef(isVoiceListening);
  useEffect(() => {
    if (isVoiceListening && !wasVoiceListeningRef.current) clearVoicePreview();
    wasVoiceListeningRef.current = isVoiceListening;
  }, [isVoiceListening, clearVoicePreview]);

  const activeEditorView = useAtomValue(atom_activeEditorView);
  const commitVoicePreview = useCallback(() => {
    const text = voicePreviewTextRef.current;
    if (text && activeEditorView) {
      typewriterInsertCM6(activeEditorView, text);
    }
    clearVoicePreview();
  }, [activeEditorView, clearVoicePreview]);
  commitVoicePreviewRef.current = commitVoicePreview;

  // The mic button lives in the global AI-chat FAB group / icon rail
  // (page.tsx). Its clicks are broadcast as a bumped counter, the same
  // request/mirror pattern atom_aiBuilderRequest uses for the AI chat dialog.
  const voiceInputRequest = useAtomValue(atom_voiceInputRequest);
  const prevVoiceInputRequestRef = useRef(voiceInputRequest);
  useEffect(() => {
    if (voiceInputRequest !== prevVoiceInputRequestRef.current) {
      prevVoiceInputRequestRef.current = voiceInputRequest;
      toggleVoiceListening();
    }
  }, [voiceInputRequest, toggleVoiceListening]);

  const setIsVoiceInputListening = useSetAtom(atom_isVoiceInputListening);
  const setIsVoiceInputSupported = useSetAtom(atom_isVoiceInputSupported);
  useEffect(() => {
    setIsVoiceInputListening(isVoiceListening);
  }, [isVoiceListening, setIsVoiceInputListening]);
  useEffect(() => {
    setIsVoiceInputSupported(isVoiceSupported);
  }, [isVoiceSupported, setIsVoiceInputSupported]);

  // Mirrors VoicePreviewPanel's own visibility rule so panes can dim
  // themselves in sync with the panel actually appearing/disappearing.
  const isPreviewVisible = isVoiceListening || voicePreviewText.length > 0 || voiceInterimText !== null;
  const setIsVoicePreviewVisible = useSetAtom(atom_isVoicePreviewVisible);
  useEffect(() => {
    setIsVoicePreviewVisible(isPreviewVisible);
  }, [isPreviewVisible, setIsVoicePreviewVisible]);

  return {
    isVoiceSupported,
    isVoiceListening,
    voiceError,
    toggleVoiceListening,
    voicePreviewText,
    setVoicePreviewText,
    voiceInterimText,
    commitVoicePreview,
    discardVoicePreview: clearVoicePreview,
  };
}
