import { Inter, IBM_Plex_Mono, IBM_Plex_Sans, Space_Mono, Literata, JetBrains_Mono, Fira_Code, Work_Sans, Source_Serif_4 } from "next/font/google";

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

// Editor mono alt — the de facto default for code editors, offered alongside IBM Plex Mono.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Editor mono alt — ligature-friendly, popular for code-heavy notes.
export const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-fira-code",
  display: "swap",
});

// Editor sans-serif option — humanist, warmer than IBM Plex Sans.
export const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-work-sans",
  display: "swap",
});

// Editor serif option — pairs with Literata, a second long-form reading choice.
export const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});
