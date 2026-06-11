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
          "SF Pro Display",
          "SF Pro Text",
          "system-ui",
          "BlinkMacSystemFont",
          "Inter",
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
        stone: '#A8A098',   // muted placeholder / faint static gray
        clay:  '#4A4440',   // dark-mode border / interactive surface

        // ── Accent / brand (static — same in both modes) ──
        sage: {
          DEFAULT: 'var(--accent)',  /* #647558 light / #fef3c7 dark */
          subtle:  '#8B9B7E',        /* decorative/non-text use only (2.6:1 on light) */
          light:   '#fef3c7',        /* Hermes pale gold — selection bg / tints */
          dark:    '#6B7A62',        /* hover / pressed state */
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover:   '#B88A5E',
        },

        // ── Static aliases (kept for explicit light/dark overrides) ──
        beige: {
          DEFAULT: '#D4C4A8',
          light:   '#EDE5D4',
        },
        paper: {
          pale:           '#FDFCFA',
          light:          '#F5F1E8',
          softgray:       '#E8E6E1',
          dark:           '#1A1816',
          'dark-surface': '#363230',
        },
        ink: {
          light: '#3A3226',
          hover: '#4A3E32',
          dark:  '#E8E4DC',
          muted: '#6B6B6B',
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
