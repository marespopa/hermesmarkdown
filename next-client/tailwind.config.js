/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // Tests and benchmarks hold no classes the app draws; leaving them out
    // keeps the dev watcher smaller (and a deleted test from failing it).
    "!./app/**/*.{test,bench}.{ts,tsx}",
  ],
  darkMode: "class",
  // `hover:` styles only apply on devices that can hover, so a tap on a phone
  // doesn't leave a control stuck in its hover state (or a tooltip shown).
  future: { hoverOnlyWhenSupported: true },
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '2.5rem',
      },
    },
    extend: {
      // Apple's HIG text styles: sizes and line heights from the iOS Dynamic
      // Type "Large" defaults, tracking first tuned for Inter's metrics (tighter
      // as text grows, slightly open at 11–12px so small labels stay legible).
      fontSize: {
        'ui-title-1': ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.021em' }],   // 28/34
        'ui-title-2': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.018em' }],   // 22/28
        'ui-title-3': ['1.25rem', { lineHeight: '1.5625rem', letterSpacing: '-0.017em' }],  // 20/25
        'ui-body': ['1.0625rem', { lineHeight: '1.375rem', letterSpacing: '-0.013em' }],    // 17/22
        'ui-callout': ['1rem', { lineHeight: '1.3125rem', letterSpacing: '-0.011em' }],     // 16/21
        'ui-subhead': ['0.9375rem', { lineHeight: '1.25rem', letterSpacing: '-0.009em' }],  // 15/20
        'ui-footnote': ['0.8125rem', { lineHeight: '1.125rem', letterSpacing: '-0.003em' }], // 13/18
        'ui-caption': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0em' }],            // 12/16
        'ui-micro': ['0.6875rem', { lineHeight: '0.8125rem', letterSpacing: '0.005em' }],   // 11/13
      },
      // Each family leads with its self-hosted face (app/fonts.ts) and falls
      // back to the Apple system face with the same role.
      fontFamily: {
        // Stacks live in globals.scss (--landing-body, --landing-hero).
        sans: ["var(--landing-body)"],
        hero: ["var(--landing-hero)"],
        mono: [
          "var(--font-geist-mono)",
          "SF Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        // ── Semantic tokens (CSS-var backed — dark mode is automatic) ──
        surface: {
          DEFAULT: 'var(--surface)',
          raised:  'var(--surface-raised)',
        },
        chrome:  'var(--chrome)',
        overlay: 'var(--overlay)',
        'input-bg': 'var(--input-bg)',
        fg: {
          DEFAULT: 'var(--fg)',
          muted:   'var(--fg-muted)',
          faint:   'var(--fg-faint)',
        },
        // Destructive actions (Button `warning`, menu rows): each palette's warm red.
        danger: 'var(--danger)',
        edge: {
          DEFAULT: 'var(--border)',
          subtle:  'var(--border-subtle)',
        },

        // ── Static neutral grays (same value in both modes) ──
        // Faint gray for placeholders, hints and icons. Backed by --fg-faint so it
        // meets 4.5:1 in both themes (a single static gray can't). Opacity
        // modifiers don't work on var colors — use an arbitrary hex for those.
        stone: 'var(--fg-faint)',
        clay:  'rgb(var(--clay-surface) / <alpha-value>)',   // dark-mode border / interactive surface (neutral — unrelated to the "clay" accent role, kept for naming-history reasons; see `accent` below for the design doc's clay accent)

        // ── Accent / brand (static — same in both modes; CSS-var backed so
        //    dark mode brightens them automatically). `accent` = doc's "clay"
        //    role (links, focus rings, active borders, unsaved dot).
        //    `sage` = doc's "moss" role (icons, muted interactive). ──
        sage: {
          DEFAULT: 'var(--moss)',
          subtle:  'var(--moss)',
          light:   'var(--moss)',
          dark:    'var(--moss)',
          hover:   'var(--moss-hover)',
        },
        // Unlike the other var colors, `accent` takes opacity modifiers
        // (`bg-accent/15`): color-mix fades the var by <alpha-value> (1 with
        // no modifier, so plain `text-accent` is the colour itself).
        accent: {
          DEFAULT: 'color-mix(in srgb, var(--clay) calc(<alpha-value> * 100%), transparent)',
          hover:   'color-mix(in srgb, var(--clay) calc(<alpha-value> * 100%), transparent)',
        },

        // Task status (TaskStatusButton, Tasks page groups, editor task box).
        task: {
          prog: 'var(--task-prog)',
          hold: 'var(--task-hold)',
          done: 'var(--task-done)',
        },

        // ── Static aliases (kept for explicit light/dark overrides) — RGB-channel
        //    vars in globals.scss, so the color themes repaint them too ──
        beige: {
          DEFAULT: 'rgb(var(--beige) / <alpha-value>)',
          light:   'rgb(var(--beige-light) / <alpha-value>)',
        },
        paper: {
          pale:           'rgb(var(--paper-pale) / <alpha-value>)',
          light:          'rgb(var(--paper-light) / <alpha-value>)',
          softgray:       'rgb(var(--paper-softgray) / <alpha-value>)',
          dark:           'rgb(var(--paper-dark) / <alpha-value>)',
          'dark-surface': 'rgb(var(--paper-dark-surface) / <alpha-value>)',
        },
        ink: {
          light: 'rgb(var(--ink-light) / <alpha-value>)',
          hover: 'rgb(var(--ink-hover) / <alpha-value>)',
          dark:  'rgb(var(--ink-dark) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      transitionDuration: {
        'overlay-backdrop': 'var(--layout-duration)', // overlay/dialog backdrop opacity fade
        'overlay-panel':    'var(--layout-duration)', // overlay sheet/edge-panel/popover/dialog slide
        // --layout-duration (globals.scss): the library, the content it
        // pushes, the editor sheet, overlay sheets and drawers. Pair with `ease-layout`.
        layout: 'var(--layout-duration)',
      },
      // `ease-spring`: the --ease-spring curve from globals.scss. An arbitrary
      // `ease-[var(--ease-spring)]` is ambiguous to Tailwind and warns on build.
      transitionTimingFunction: {
        spring: 'var(--ease-spring)',
        layout: 'var(--ease-layout)',
      },
    }
  },
  plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate")],
};
