/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontSize: {
        'ui-title-1': ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.022em' }], // 28px
        'ui-title-2': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.019em' }], // 22px
        'ui-title-3': ['1.25rem', { lineHeight: '1.625rem', letterSpacing: '-0.016em' }], // 20px
        'ui-body': ['1.0625rem', { lineHeight: '1.5rem', letterSpacing: '-0.011em' }],     // 17px
        'ui-callout': ['1rem', { lineHeight: '1.375rem', letterSpacing: '-0.009em' }],     // 16px
        'ui-subhead': ['0.9375rem', { lineHeight: '1.25rem', letterSpacing: '-0.006em' }],   // 15px
        'ui-footnote': ['0.8125rem', { lineHeight: '1.125rem', letterSpacing: '-0.003em' }], // 13px
        'ui-caption': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.000em' }],        // 12px
        'ui-micro': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.000em' }],    // 11px
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "SF Pro Display",
          "SF Pro Text",
          "system-ui",
          "BlinkMacSystemFont",
          "ui-sans-serif",
          "sans-serif",
        ],
        serif: [
          "New York",
          "ui-serif",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "Times",
          "serif",
        ],
        mono: [
          "SF Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
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
        stone: '#9A968F',   // muted placeholder / faint static gray
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
          dark:           '#211E1B',
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
    }
  },
  plugins: [require("@tailwindcss/typography")],
};
