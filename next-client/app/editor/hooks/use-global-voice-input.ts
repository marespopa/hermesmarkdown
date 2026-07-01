"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  atom_voiceInputRequest,
  atom_isVoiceInputListening,
  atom_isVoiceInputSupported,
  atom_isVoicePreviewVisible,
  atom_activeTextareaElement,
  atom_voiceOpenLinkDialogRequest,
} from "@/app/atoms/atoms";
import { useVoiceInput } from "./use-voice-input";
import type { VoiceInsertion } from "../utils/voice-command-parser";

// A single shared dictation session for the whole app — instantiated once
// (in page.tsx), not per pane. Switching the active pane mid-dictation must
// not drop the in-progress preview or restart the mic, so neither the
// SpeechRecognition session nor the preview buffer is scoped to any one
// pane's lifecycle. "Insert" writes into whichever textarea is currently
// registered as active (see atom_activeTextareaElement).
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
  const setVoiceOpenLinkDialogRequest = useSetAtom(atom_voiceOpenLinkDialogRequest);

  const handleVoiceInsertion = useCallback((insertion: VoiceInsertion) => {
    if (insertion.kind === "none") return;

    if (insertion.kind === "open-link-dialog") {
      setVoiceOpenLinkDialogRequest((v) => v + 1);
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
    const next = base + insertion.text;
    voicePreviewTextRef.current = next;
    setVoicePreviewTextState(next);
    lastVoiceChunkLengthRef.current = insertion.text.length;
  }, [setVoiceOpenLinkDialogRequest]);

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

  const clearVoicePreview = useCallback(() => {
    voicePreviewTextRef.current = "";
    setVoicePreviewTextState("");
    setVoiceInterimText(null);
    lastVoiceChunkLengthRef.current = null;
  }, []);

  // Starting a fresh listening session discards any leftover unconfirmed
  // preview from before, rather than silently continuing to build on it.
  const wasVoiceListeningRef = useRef(isVoiceListening);
  useEffect(() => {
    if (isVoiceListening && !wasVoiceListeningRef.current) clearVoicePreview();
    wasVoiceListeningRef.current = isVoiceListening;
  }, [isVoiceListening, clearVoicePreview]);

  const activeTextareaElement = useAtomValue(atom_activeTextareaElement);
  const commitVoicePreview = useCallback(() => {
    const text = voicePreviewTextRef.current;
    const textarea = activeTextareaElement;
    if (text && textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.focus();
      textarea.setSelectionRange(start, end);
      document.execCommand("insertText", false, text);
    }
    clearVoicePreview();
  }, [activeTextareaElement, clearVoicePreview]);

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
