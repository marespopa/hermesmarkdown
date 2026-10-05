import { Geist_Mono, Inter, Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";

// Four typefaces, one job each. Fallbacks name the matching Apple system face
// so a slow network still lands on something with the same voice.

// System UI: tab bar, menus, buttons, labels, lists and tables. A variable font
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

// Editorial sans: display headings and the default writing face.
export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

// Literary serif for long-form reading. The optical-size axis lets the
// face tighten for headings and open up at text sizes on its own.
export const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-source-serif",
  display: "swap",
});
