// Documents the app's existing z-index scale (verified via grep across app/,
// not renumbered). Tailwind's JIT scanner needs literal `z-[...]` class
// strings in source, so these numeric constants are for reference/comments
// only — components still hardcode the matching literal class.
export const Z = {
  DISMISS_LAYER: 40, // transparent click-away hit-targets (context menus, edge-hover strips)
  MENU: 50, // dropdowns, tooltips, context menus
  CHROME: 100, // header, loading overlay, AI thinking overlay
  TOAST: 200, // toast notifications
  OVERLAY: 1000, // OverlayLayer modal-class content — literal class: z-[1000]
} as const;
