import "./globals.scss";
import MainPage from "./components/MainPage";
import { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://hermesmarkdown.com"),
  title: "Hermes — Free AI Prompt Editor | Local-First Markdown",
  description: "Hermes is a free, local-first AI prompt editor. Draft, refine, and organise prompts with 30+ slash command templates, custom snippets, token estimates, and clarity scores — no sign-up, no cloud, works offline.",
  applicationName: "Hermes Markdown",
  authors: [{ name: "Mares Popa", url: "https://www.marespopa.com/" }],
  keywords: [
    "AI prompt editor",
    "prompt engineering tool",
    "local-first markdown editor",
    "slash command templates",
    "offline markdown editor",
    "privacy-first editor",
    "ChatGPT prompt writer",
    "prompt drafting",
    "custom snippets",
    "token counter",
  ],
  robots: { index: true, follow: true },
  alternates: { canonical: "https://hermesmarkdown.com" },
  openGraph: {
    title: "Hermes — Free AI Prompt Editor | Local-First Markdown",
    description: "Draft better AI prompts with 30+ built-in slash command templates, custom snippets, and real-time token estimates. Free, offline, no sign-up.",
    url: "https://hermesmarkdown.com/",
    siteName: "Hermes Markdown",
    type: "website",
    images: [{ url: "/assets/hero/niceday@2x.jpg", width: 1200, height: 630, alt: "Hermes AI Prompt Editor interface" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hermes — Free AI Prompt Editor | Local-First Markdown",
    description: "Draft better AI prompts with 30+ slash command templates and custom snippets. Free, offline, no sign-up.",
    images: ["/assets/hero/niceday@2x.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className="h-full min-h-screen bg-white dark:bg-neutral-900 transition-colors duration-300"
        suppressHydrationWarning
      >
        <MainPage>{children}</MainPage>
      </body>
    </html>
  );
}
