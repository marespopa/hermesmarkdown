import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useVoiceInput } from "./use-voice-input";

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
}

describe("useVoiceInput", () => {
  beforeEach(() => {
    MockSpeechRecognition.instances = [];
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  });

  it("treats 'audio-capture' as fatal and stops without restarting", () => {
    const { result } = renderHook(() => useVoiceInput({ onInsertion: vi.fn() }));

    act(() => result.current.toggleListening());
    const recognition = MockSpeechRecognition.instances[0];
    expect(recognition.start).toHaveBeenCalledTimes(1);

    act(() => {
      recognition.onerror?.({ error: "audio-capture" });
      recognition.onend?.();
    });

    expect(result.current.error).toBe("no-microphone");
    expect(result.current.isListening).toBe(false);
    expect(recognition.start).toHaveBeenCalledTimes(1);
  });

  it("treats 'no-speech' as transient and restarts on end", () => {
    const { result } = renderHook(() => useVoiceInput({ onInsertion: vi.fn() }));

    act(() => result.current.toggleListening());
    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onerror?.({ error: "no-speech" });
      recognition.onend?.();
    });

    expect(result.current.error).toBe(null);
    expect(recognition.start).toHaveBeenCalledTimes(2);
  });

  it("does not restart after a user-initiated stop", () => {
    const { result } = renderHook(() => useVoiceInput({ onInsertion: vi.fn() }));

    act(() => result.current.toggleListening());
    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      result.current.toggleListening();
      recognition.onend?.();
    });

    expect(result.current.isListening).toBe(false);
    expect(recognition.start).toHaveBeenCalledTimes(1);
  });
});
