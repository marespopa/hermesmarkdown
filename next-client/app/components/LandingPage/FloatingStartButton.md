# FloatingStartButton

Description: The home page's "Start Writing" that follows you down the page. A glass pill (`.glass-panel`) centered at the bottom of the window, above the safe area, holding a short line ("No account. Your notes stay on your device.", from `sm` up) and the hero-style button. Below `sm`, where the line is hidden, the padding is even so the button sits centered in the pill. It slides and fades in once the hero's call to action has scrolled out of view above (`heroRef`'s bottom edge above the viewport), and out again when you scroll back up, so there is always one call to action in reach and never two on screen. Checked on scroll and resize, at most once a frame (`requestAnimationFrame`). Hidden, it's `inert` and `aria-hidden`, so it's out of the tab order and the accessibility tree. No transition when reduced motion is asked for.

## Local State & Storage
- State: `isVisible` (useState), from the hero's position.
- Persistence: None.

## Dependencies
- Core: `Button` (`hero` variant).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import FloatingStartButton from "./FloatingStartButton";

const heroCtaRef = useRef<HTMLDivElement>(null);
<div ref={heroCtaRef}>…hero buttons…</div>
<FloatingStartButton heroRef={heroCtaRef} onStart={handleStart} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| heroRef | `RefObject<HTMLElement \| null>` |  | The hero's call to action; the button shows once it has scrolled away above |
| onStart | `() => void` |  | What Start Writing does (the page's `handleStart`) |
