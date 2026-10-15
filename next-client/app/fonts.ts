import { Geist_Mono, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";

// Plus Jakarta Sans for the interface, Instrument Serif for the marketing
// pages' hero headings, Geist Mono for code and writing, and two writing-only
// faces, Duospace and Quattro. Fallbacks name the matching system face so a
// slow network still lands on something with the same voice.

// Interface, body text and headings: a warm, humanist variable sans.
export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

// Hero headings on the landing and marketing pages (`font-hero`). One weight;
// the italic covers emphasis inside a headline.
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

// Technical: code, raw syntax, YAML, keyboard chips and tabular figures.
export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// Writing only: a duospaced face (most letters share one width, m/M/w/W take
// one and a half) for a typewriter rhythm that reads less mechanically than
// a monospace. Built on IBM Plex Mono, self-hosted under the SIL OFL
// (font-files/duospace/OFL.md) since no font service carries it.
export const duospace = localFont({
  src: [
    { path: "./font-files/duospace/duospace-regular.woff2", weight: "400", style: "normal" },
    { path: "./font-files/duospace/duospace-italic.woff2", weight: "400", style: "italic" },
    { path: "./font-files/duospace/duospace-bold.woff2", weight: "700", style: "normal" },
    { path: "./font-files/duospace/duospace-bold-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-duospace",
  display: "swap",
  // Only loaded where the setting picks it.
  preload: false,
});

// Writing only: the proportional sibling of Duospace, from the same family
// and licence (font-files/quattro/OFL.md). Four widths instead of one, so it
// keeps a typewriter's even texture while reading like a book face.
export const quattro = localFont({
  src: [
    { path: "./font-files/quattro/quattro-regular.woff2", weight: "400", style: "normal" },
    { path: "./font-files/quattro/quattro-italic.woff2", weight: "400", style: "italic" },
    { path: "./font-files/quattro/quattro-bold.woff2", weight: "700", style: "normal" },
    { path: "./font-files/quattro/quattro-bold-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-quattro",
  display: "swap",
  preload: false,
});
