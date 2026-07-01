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

function finalResult(transcript: string) {
  const result = Object.assign([{ transcript }], { isFinal: true });
  return { resultIndex: 0, results: [result] };
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

  it("marks a growing re-finalized result as replacing the previous insertion", () => {
    const onInsertion = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onInsertion }));

    act(() => result.current.toggleListening());
    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onresult?.(finalResult("why"));
      recognition.onresult?.(finalResult("why is"));
      recognition.onresult?.(finalResult("why is the future"));
    });

    expect(onInsertion).toHaveBeenCalledTimes(3);
    expect(onInsertion).toHaveBeenNthCalledWith(1, expect.objectContaining({ text: "Why" }));
    expect(onInsertion.mock.calls[0][0].replacePrevious).toBeUndefined();
    expect(onInsertion).toHaveBeenNthCalledWith(2, expect.objectContaining({ text: "Why is", replacePrevious: true }));
    expect(onInsertion).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ text: "Why is the future", replacePrevious: true }),
    );
  });

  it("does not mark an unrelated final result as replacing the previous one", () => {
    const onInsertion = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onInsertion }));

    act(() => result.current.toggleListening());
    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onresult?.(finalResult("bullet apples"));
      recognition.onresult?.(finalResult("bullet bananas"));
    });

    expect(onInsertion).toHaveBeenCalledTimes(2);
    expect(onInsertion).toHaveBeenNthCalledWith(1, expect.objectContaining({ text: "- Apples" }));
    expect(onInsertion).toHaveBeenNthCalledWith(2, expect.objectContaining({ text: "- Bananas" }));
    expect(onInsertion.mock.calls[0][0].replacePrevious).toBeUndefined();
    expect(onInsertion.mock.calls[1][0].replacePrevious).toBeUndefined();
  });

  it("ignores an exact-duplicate final result", () => {
    const onInsertion = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onInsertion }));

    act(() => result.current.toggleListening());
    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onresult?.(finalResult("new paragraph"));
      recognition.onresult?.(finalResult("new paragraph"));
    });

    expect(onInsertion).toHaveBeenCalledTimes(1);
  });

  it("still inserts a repeated short command said again after a short gap", () => {
    vi.useFakeTimers();
    const onInsertion = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onInsertion }));

    act(() => result.current.toggleListening());
    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onresult?.(finalResult("new line"));
      vi.advanceTimersByTime(2000);
      recognition.onresult?.(finalResult("new line"));
    });

    expect(onInsertion).toHaveBeenCalledTimes(2);
    expect(onInsertion).toHaveBeenNthCalledWith(1, expect.objectContaining({ text: "\n" }));
    expect(onInsertion).toHaveBeenNthCalledWith(2, expect.objectContaining({ text: "\n" }));
    expect(onInsertion.mock.calls[1][0].replacePrevious).toBeUndefined();
    vi.useRealTimers();
  });
});
