import { Inter, IBM_Plex_Mono, Literata, JetBrains_Mono, Work_Sans } from "next/font/google";

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

// Editor sans-serif option — humanist and warm, fits the app's warm-neutral palette.
export const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-work-sans",
  display: "swap",
});
