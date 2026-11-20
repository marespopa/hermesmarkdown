# useScriptLoop

Description: The engine behind the home page's demos. It plays a script of steps on a loop and returns the position; each demo turns the position into a picture. Steps: `{ type: "text" }` (typed a key at a time, a longer breath before each newline), `{ key: "Tab" }` (a key press, whose meaning the demo decides) and `{ pause: ms }` (rest after the previous frame). Also exports `buildFrames`, `appliedSteps` (the steps played so far, the current one cut to what is typed) and `typedText` (all text typed so far).

## Local State & Storage
- State: `{ step, typed }` (useState): steps before `step` are done, `typed` is the part of step `step` typed. It starts at the finished demo (`step` = number of steps), so the server render, the first paint and reduced motion all show the still of the end.
- Persistence: none.

## Behavior
- After 1.2 s the loop starts from empty, plays through the script, rests on the pauses, and starts again.
- `prefers-reduced-motion: reduce`: no loop at all.
- Waits while `document.hidden`, and while the element carrying the returned `ref` is off screen (IntersectionObserver; without it the demo counts as on screen), so several demos never run at once.

## Dependencies
- Core: React. Zero-Cloud: no network requests.

## Quick Usage
```tsx
const SCRIPT: readonly ScriptStep[] = [{ type: "Hi" }, { pause: 2000 }]; // module level, so it is stable
const { ref, state } = useScriptLoop(SCRIPT);
```

## Props Overview
| Arg | Type | Description |
|---|---|---|
| steps | `readonly ScriptStep[]` | The script; keep it a module constant |
Returns `{ ref, state }`.
