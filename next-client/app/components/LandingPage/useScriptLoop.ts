"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// The engine behind the home page's demos: plays a short script of typed text,
// key presses and pauses on a loop, drawn by the page itself.

/** One step of a demo script. */
export type ScriptStep =
  | { type: string }
  | { key: string }
  | { pause: number };

/** Where the loop is: steps before `step` are done, `typed` is the part of step `step` typed so far. */
export type LoopState = { step: number; typed: string };

type Frame = LoopState & { delay: number };

const START_MS = 1200;
const KEY_MS = 70;
const LINE_MS = 360;
const PRESS_MS = 420;
const WAIT_MS = 400;

/** Every picture the loop shows, in order, with how long each stays up. Exported for tests. */
export function buildFrames(steps: readonly ScriptStep[]): Frame[] {
  const frames: Frame[] = [{ step: 0, typed: "", delay: KEY_MS }];
  const last = () => frames[frames.length - 1];
  steps.forEach((step, index) => {
    if ("type" in step) {
      for (let n = 1; n <= step.type.length; n++) {
        frames.push({ step: index, typed: step.type.slice(0, n), delay: step.type[n] === "\n" ? LINE_MS : KEY_MS });
      }
    } else if ("key" in step) {
      last().delay = Math.max(last().delay, PRESS_MS);
      frames.push({ step: index + 1, typed: "", delay: PRESS_MS });
    } else {
      last().delay += step.pause;
    }
  });
  return frames;
}

/** The steps played so far, the one being typed cut to what is typed. */
export function appliedSteps(steps: readonly ScriptStep[], state: LoopState): ScriptStep[] {
  const done = steps.slice(0, state.step);
  const current = steps[state.step];
  return current && "type" in current && state.typed ? [...done, { type: state.typed }] : done;
}

/** All the text typed so far, in order. */
export function typedText(steps: readonly ScriptStep[], state: LoopState): string {
  return appliedSteps(steps, state).reduce((text, step) => ("type" in step ? text + step.type : text), "");
}

/**
 * Plays `steps` on a loop. The first state is the still of the finished demo
 * (also what the server renders, and all that reduced motion ever shows). The
 * loop waits while the tab is hidden or the demo is off screen, so several
 * demos never run at once. Put the returned `ref` on the demo's frame.
 */
export function useScriptLoop(steps: readonly ScriptStep[]): { ref: RefObject<HTMLDivElement | null>; state: LoopState } {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoopState>({ step: steps.length, typed: "" });

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const frames = buildFrames(steps);
    let onScreen = true;
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined" && ref.current) {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (entry) onScreen = entry.isIntersecting;
      });
      observer.observe(ref.current);
    }
    let at = 0;
    let timer = 0;
    const tick = () => {
      if (document.hidden || !onScreen) {
        timer = window.setTimeout(tick, WAIT_MS);
        return;
      }
      const { step, typed, delay } = frames[at];
      setState({ step, typed });
      at = (at + 1) % frames.length;
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, START_MS);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [steps]);

  return { ref, state };
}
