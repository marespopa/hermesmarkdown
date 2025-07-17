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
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Merriweather", "Georgia", "serif"],
        mono: ["Source Code Pro", "ui-monospace", "monospace"],
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
