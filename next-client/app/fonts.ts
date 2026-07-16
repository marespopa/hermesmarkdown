import { Inter, IBM_Plex_Mono, IBM_Plex_Sans, Space_Mono, Literata } from "next/font/google";

// UI chrome only (sidebar, menus, buttons, labels) — never used in the writing pane.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Editor mono default — closest equivalent to iA Writer's own typeface, which is
// itself a modification of the upstream IBM Plex family.
export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-ibm-mono",
  display: "swap",
});

// Editor mono alt — quirky, confident, expressive.
export const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-space-mono",
  display: "swap",
});

// Editor sans-serif option — pairs with IBM Plex Mono, distinct from Inter (UI chrome).
export const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-ibm-sans",
  display: "swap",
});

// Editor serif option — variable font built for on-screen long-form reading.
export const literata = Literata({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-literata",
  display: "swap",
});
