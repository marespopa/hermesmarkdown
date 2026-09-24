import { Geist_Mono, IBM_Plex_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";

// UI chrome surfaces such as the sidebar, menus, buttons, and labels.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Optional technical font for source Markdown and raw syntax.
export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// Technical metadata surfaces: YAML, code blocks, and status chips.
export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-ibm-mono",
  display: "swap",
});

// Editorial headings and optional prose accents.
export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});
