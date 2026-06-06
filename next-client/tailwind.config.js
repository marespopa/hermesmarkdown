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
      },
      colors: {
        softyellow: {
          DEFAULT: '#FFF6D6',
        },
        strongblack: {
          DEFAULT: '#181818',
        },
        darkbg: {
          DEFAULT: '#181A1B', // accessible dark background
        },
        softbg: {
          DEFAULT: '#FFF9E5',
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
