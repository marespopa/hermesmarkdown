import type { TypewriterVolume } from "@/app/atoms/ui-atoms";

export type TypewriterKey = "key" | "space" | "return" | "back";

// Which sound a keydown makes, or null for no sound: printable characters,
// Space, Enter and Backspace/Delete, typed plainly. Shortcuts (Ctrl/Cmd/Alt),
// IME composition, and navigation or modifier keys are silent.
export function typewriterKind(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "isComposing">): TypewriterKey | null {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return null;
  if (event.key === "Enter") return "return";
  if (event.key === " ") return "space";
  if (event.key === "Backspace" || event.key === "Delete") return "back";
  return event.key.length === 1 ? "key" : null;
}

// Whether a keydown names its key. An on-screen keyboard (and an IME) sends
// "Unidentified" or "Process" for most keys, so those are heard from the
// `beforeinput` that follows instead (`typewriterInputKind`).
export function typewriterKeyNamed(event: Pick<KeyboardEvent, "key" | "keyCode" | "isComposing">): boolean {
  return !event.isComposing && event.keyCode !== 229 && event.key !== "Unidentified" && event.key !== "Process";
}

// Which sound a `beforeinput` makes, or null for no sound: text typed or
// composed, a line break, or a character deleted. `composing` is the text of
// the composition so far (an on-screen keyboard composes each word): a
// composition that got shorter is a delete, and one that didn't change (the
// commit at its end) is silent. Paste, cut, drop, undo and the rest are silent.
export function typewriterInputKind(event: Pick<InputEvent, "inputType" | "data">, composing = ""): TypewriterKey | null {
  const text = event.data ?? "";
  switch (event.inputType) {
    case "insertLineBreak":
    case "insertParagraph":
      return "return";
    case "deleteContentBackward":
    case "deleteContentForward":
      return "back";
    case "insertCompositionText":
      if (text === composing) return null;
      if (text.length < composing.length) return "back";
      return textKind(text);
    case "insertText":
      return textKind(text);
    default:
      return null;
  }
}

function textKind(text: string): TypewriterKey | null {
  if (!text) return null;
  const last = text[text.length - 1];
  if (last === "\n") return "return";
  return last === " " ? "space" : "key";
}

// Band-pass centre of the key's clack, the clack's loudness, the length of
// its decay and the pitch of the thump under it.
const VOICES: Record<TypewriterKey, { clack: number; level: number; decay: number; thump: number }> = {
  key: { clack: 2600, level: 0.32, decay: 0.05, thump: 170 },
  space: { clack: 1300, level: 0.4, decay: 0.07, thump: 110 },
  back: { clack: 2100, level: 0.24, decay: 0.045, thump: 150 },
  return: { clack: 1000, level: 0.5, decay: 0.09, thump: 90 },
};
// The master gain of each volume (Settings → Editor → Typewriter Sound).
// Normal is full level (1), as a media player at 100%.
export const TYPEWRITER_GAIN: Record<TypewriterVolume, number> = { quiet: 0.4, normal: 1, loud: 1.6 };
// Held keys repeat fast; one click per this many ms keeps it a click, not a buzz.
const MIN_GAP_MS = 25;

// A typewriter's clack, synthesised on the Web Audio API (no audio files, so
// it works offline): a short band-passed noise burst and a low thump, a
// little different each time, and a carriage return (a slide and a
// clunk) on Enter. The audio context is
// made on the first key (a user gesture, as browsers need) and closed by
// `close`. `setVolume` sets the master gain, before or after that first key.
export function createTypewriterSound() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let last = 0;
  let gain = TYPEWRITER_GAIN.normal;

  function context(): AudioContext | null {
    if (ctx) return ctx;
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    ctx = new Context();
    master = ctx.createGain();
    master.gain.value = gain;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  const vary = (value: number, spread: number) => value * (1 - spread + Math.random() * spread * 2);

  function play(kind: TypewriterKey) {
    try {
      const now = performance.now();
      if (now - last < MIN_GAP_MS) return;
      last = now;
      const c = context();
      if (!c || !master || !noise) return;
      if (c.state === "suspended") void c.resume();
      const t = c.currentTime;
      const voice = VOICES[kind];

      const clack = c.createBufferSource();
      clack.buffer = noise;
      const band = c.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = vary(voice.clack, 0.15);
      band.Q.value = 1.4;
      const clackGain = c.createGain();
      clackGain.gain.setValueAtTime(0.0001, t);
      clackGain.gain.exponentialRampToValueAtTime(vary(voice.level, 0.2), t + 0.002);
      clackGain.gain.exponentialRampToValueAtTime(0.0001, t + voice.decay);
      clack.connect(band).connect(clackGain).connect(master);
      clack.start(t, Math.random() * 0.3);
      clack.stop(t + voice.decay + 0.02);

      const thump = c.createOscillator();
      thump.frequency.setValueAtTime(vary(voice.thump, 0.1), t);
      thump.frequency.exponentialRampToValueAtTime(60, t + 0.07);
      const thumpGain = c.createGain();
      thumpGain.gain.setValueAtTime(0.0001, t);
      thumpGain.gain.exponentialRampToValueAtTime(0.2, t + 0.003);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      thump.connect(thumpGain).connect(master);
      thump.start(t);
      thump.stop(t + 0.1);

      if (kind === "return") {
        // The carriage return: the carriage slides across (a band of noise
        // rising in pitch), then stops with a heavy clunk. Nothing tonal.
        const slideFrom = t + 0.02;
        const stopAt = t + 0.17;
        const slide = c.createBufferSource();
        slide.buffer = noise;
        const slideBand = c.createBiquadFilter();
        slideBand.type = "bandpass";
        slideBand.Q.value = 2;
        slideBand.frequency.setValueAtTime(500, slideFrom);
        slideBand.frequency.exponentialRampToValueAtTime(2400, stopAt);
        const slideGain = c.createGain();
        slideGain.gain.setValueAtTime(0.0001, slideFrom);
        slideGain.gain.exponentialRampToValueAtTime(0.12, slideFrom + 0.03);
        slideGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
        slide.connect(slideBand).connect(slideGain).connect(master);
        slide.start(slideFrom, Math.random() * 0.3);
        slide.stop(stopAt + 0.02);

        const clunk = c.createOscillator();
        clunk.frequency.setValueAtTime(85, stopAt);
        clunk.frequency.exponentialRampToValueAtTime(45, stopAt + 0.09);
        const clunkGain = c.createGain();
        clunkGain.gain.setValueAtTime(0.0001, stopAt);
        clunkGain.gain.exponentialRampToValueAtTime(0.35, stopAt + 0.004);
        clunkGain.gain.exponentialRampToValueAtTime(0.0001, stopAt + 0.13);
        clunk.connect(clunkGain).connect(master);
        clunk.start(stopAt);
        clunk.stop(stopAt + 0.15);

        const knock = c.createBufferSource();
        knock.buffer = noise;
        const knockLow = c.createBiquadFilter();
        knockLow.type = "lowpass";
        knockLow.frequency.value = 900;
        const knockGain = c.createGain();
        knockGain.gain.setValueAtTime(0.0001, stopAt);
        knockGain.gain.exponentialRampToValueAtTime(0.3, stopAt + 0.003);
        knockGain.gain.exponentialRampToValueAtTime(0.0001, stopAt + 0.07);
        knock.connect(knockLow).connect(knockGain).connect(master);
        knock.start(stopAt, Math.random() * 0.3);
        knock.stop(stopAt + 0.09);
      }
    } catch {
      // Audio is a nicety: a browser that refuses it just types silently.
    }
  }

  return {
    play,
    // The volume of every click from now on.
    setVolume(volume: TypewriterVolume) {
      gain = TYPEWRITER_GAIN[volume];
      if (master) master.gain.value = gain;
    },
    close() {
      const old = ctx;
      ctx = null;
      master = null;
      noise = null;
      if (old && old.state !== "closed") void old.close().catch(() => {});
    },
  };
}

export type TypewriterSound = ReturnType<typeof createTypewriterSound>;
