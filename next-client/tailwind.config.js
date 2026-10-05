/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
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
      // Type "Large" defaults, tracking from Inter's dynamic metrics (tighter
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
        sans: [
          "var(--font-inter)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "ui-sans-serif",
          "sans-serif",
        ],
        display: [
          "var(--font-plus-jakarta)",
          "var(--font-inter)",
          "system-ui",
          "-apple-system",
          "ui-sans-serif",
          "sans-serif",
        ],
        serif: [
          "var(--font-source-serif)",
          "New York",
          "ui-serif",
          "Georgia",
          "serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "SF Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        sourcecode: ["Source Code Pro", "ui-monospace", "monospace"],
        journal: ["Georgia", "ui-serif", "serif"],
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
        edge: {
          DEFAULT: 'var(--border)',
          subtle:  'var(--border-subtle)',
        },

        // ── Static neutral grays (same value in both modes) ──
        // Faint gray for placeholders, hints and icons. Backed by --fg-faint so it
        // meets 4.5:1 in both themes (a single static gray can't). Opacity
        // modifiers don't work on var colors — use an arbitrary hex for those.
        stone: 'var(--fg-faint)',
        clay:  '#3A3631',   // dark-mode border / interactive surface (neutral — unrelated to the "clay" accent role, kept for naming-history reasons; see `accent` below for the design doc's clay accent)

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
        accent: {
          DEFAULT: 'var(--clay)',
          hover:   'var(--clay)',
        },

        // ── Static aliases (kept for explicit light/dark overrides) ──
        beige: {
          DEFAULT: '#D8D5CE',
          light:   '#E9E7E2',
        },
        paper: {
          pale:           '#FAF9F7',
          light:          '#F2F1EE',
          softgray:       '#E9E7E2',
          dark:           '#181614',
          'dark-surface': '#2A2622',
        },
        ink: {
          light: '#2A2825',
          hover: '#3A3733',
          dark:  '#ECE7E0',
          muted: '#6B6862',
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      transitionDuration: {
        'overlay-backdrop': '150ms', // OverlayLayer backdrop opacity fade
        'overlay-panel':    '200ms', // OverlayLayer sheet/edge-panel/popover slide
      },
    }
  },
  plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate")],
};
