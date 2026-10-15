import { Geist_Mono, Inter } from "next/font/google";

// Two typefaces: Inter for everything sans (interface, headings, writing),
// Geist Mono for code. Fallbacks name the matching Apple system face
// so a slow network still lands on something with the same voice.

// Interface, headings and the writing face. A variable font
// whose metrics sit close to SF Pro; the ui-* type scale (tailwind.config.js)
// is tracked for it.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Technical: code, raw syntax, YAML, keyboard chips and tabular figures.
export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});
