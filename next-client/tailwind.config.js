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
      fontFamily: {
        sans: [
          "SF Pro Display",
          "SF Pro Text",
          "system-ui",
          "-apple-system",
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
