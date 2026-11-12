import { afterEach, describe, expect, it, vi } from "vitest";
import { createTypewriterSound, typewriterInputKind, typewriterKeyNamed, typewriterKind } from "./typewriter-sound";

const key = (overrides: Partial<Parameters<typeof typewriterKind>[0]>) =>
  typewriterKind({ key: "a", ctrlKey: false, metaKey: false, altKey: false, isComposing: false, ...overrides });

describe("typewriterKind", () => {
  it("sounds for typed characters, Space, Enter and deleting", () => {
    expect(key({ key: "a" })).toBe("key");
    expect(key({ key: "A" })).toBe("key");
    expect(key({ key: "?" })).toBe("key");
    expect(key({ key: " " })).toBe("space");
    expect(key({ key: "Enter" })).toBe("return");
    expect(key({ key: "Backspace" })).toBe("back");
    expect(key({ key: "Delete" })).toBe("back");
  });

  it("is silent for shortcuts, composition, navigation and modifier keys", () => {
    expect(key({ key: "s", metaKey: true })).toBeNull();
    expect(key({ key: "b", ctrlKey: true })).toBeNull();
    expect(key({ key: "k", altKey: true })).toBeNull();
    expect(key({ key: "a", isComposing: true })).toBeNull();
    for (const name of ["ArrowLeft", "Shift", "Escape", "Tab", "Control", "F5", "Dead"]) expect(key({ key: name })).toBeNull();
  });
});

describe("typewriterKeyNamed", () => {
  it("is true for a hardware key and false for an on-screen keyboard's or an IME's", () => {
    expect(typewriterKeyNamed({ key: "a", keyCode: 65, isComposing: false })).toBe(true);
    expect(typewriterKeyNamed({ key: "Enter", keyCode: 13, isComposing: false })).toBe(true);
    expect(typewriterKeyNamed({ key: "Unidentified", keyCode: 229, isComposing: false })).toBe(false);
    expect(typewriterKeyNamed({ key: "Process", keyCode: 229, isComposing: false })).toBe(false);
    expect(typewriterKeyNamed({ key: "a", keyCode: 65, isComposing: true })).toBe(false);
  });
});

describe("typewriterInputKind", () => {
  const kind = (inputType: string, data: string | null = null, composing?: string) => typewriterInputKind({ inputType, data }, composing);

  it("sounds for typed text, line breaks and deleting", () => {
    expect(kind("insertText", "a")).toBe("key");
    expect(kind("insertText", "word")).toBe("key");
    expect(kind("insertText", " ")).toBe("space");
    expect(kind("insertText", "word ")).toBe("space");
    expect(kind("insertText", "\n")).toBe("return");
    expect(kind("insertLineBreak")).toBe("return");
    expect(kind("insertParagraph")).toBe("return");
    expect(kind("deleteContentBackward")).toBe("back");
    expect(kind("deleteContentForward")).toBe("back");
  });

  it("follows a composition: longer is a key, shorter a delete, unchanged silent", () => {
    expect(kind("insertCompositionText", "t")).toBe("key");
    expect(kind("insertCompositionText", "ta", "t")).toBe("key");
    expect(kind("insertCompositionText", "t", "ta")).toBe("back");
    expect(kind("insertCompositionText", "", "t")).toBe("back");
    expect(kind("insertCompositionText", "ta", "ta")).toBeNull();
    expect(kind("insertCompositionText", null)).toBeNull();
  });

  it("is silent for paste, cut, drop, undo and empty text", () => {
    for (const type of ["insertFromPaste", "insertFromDrop", "deleteByCut", "deleteWordBackward", "historyUndo", "formatBold"]) expect(kind(type, "text")).toBeNull();
    expect(kind("insertText", "")).toBeNull();
    expect(kind("insertText", null)).toBeNull();
  });
});

function fakeContext() {
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const node = () => {
    const n: Record<string, unknown> = { connect: vi.fn((next: unknown) => next ?? n), start: vi.fn(), stop: vi.fn(), gain: param(), frequency: param(), Q: param(), type: "" };
    return n;
  };
  const ctx = {
    state: "running",
    sampleRate: 100,
    currentTime: 0,
    destination: {},
    resume: vi.fn(),
    close: vi.fn(async () => {}),
    createBuffer: vi.fn((_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) })),
    createBufferSource: vi.fn(node),
    createGain: vi.fn(node),
    createBiquadFilter: vi.fn(node),
    createOscillator: vi.fn(node),
  };
  return ctx;
}

describe("createTypewriterSound", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function setup() {
    const ctx = fakeContext();
    vi.stubGlobal("AudioContext", function () { return ctx; });
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    return { ctx, advance: (ms: number) => { now += ms; } };
  }

  it("makes the audio context only on the first key", () => {
    const { ctx } = setup();
    const sound = createTypewriterSound();
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    sound.play("key");
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
    expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
  });

  it("adds a carriage return (a slide and a clunk) on Enter, not on other keys, and nothing tonal", () => {
    const { ctx, advance } = setup();
    const sound = createTypewriterSound();
    sound.play("key");
    expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
    advance(100);
    sound.play("return");
    // The key's thump, plus the clunk; the slide and the knock are noise.
    expect(ctx.createOscillator).toHaveBeenCalledTimes(3);
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(4);
  });

  it("makes one click for a burst of keys", () => {
    const { ctx, advance } = setup();
    const sound = createTypewriterSound();
    sound.play("key");
    advance(5);
    sound.play("key");
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
    advance(30);
    sound.play("key");
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);
  });

  it("stays silent, without throwing, where Web Audio is missing", () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(() => createTypewriterSound().play("key")).not.toThrow();
  });

  it("closes the context", () => {
    const { ctx } = setup();
    const sound = createTypewriterSound();
    sound.play("key");
    sound.close();
    expect(ctx.close).toHaveBeenCalledOnce();
  });
});
