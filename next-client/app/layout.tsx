import "./globals.scss";
import MainPage from "./components/MainPage";
import { Metadata, Viewport } from "next";
import { jetBrainsMono, firaCode, ibmPlexMono } from "./fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://hermesmarkdown.com"),
  title: "Hermes — Local-First Markdown Editor",
  description:
    "A minimalist, privacy-focused Markdown editor for deep work. No cloud, no tracking, and no distractions. Your data stays on your device.",
  applicationName: "Hermes",
  authors: [{ name: "Mares Popa", url: "https://www.marespopa.com/" }],
  keywords: [
    "local-first markdown",
    "minimalist editor",
    "offline writing",
    "privacy focused",
    "no-cloud notes",
    "distraction-free editor",
  ],
  manifest: "/manifest.json",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Hermes — Local-First Markdown",
    description: "Just you and the page. Pure, offline, and private.",
    url: "https://hermesmarkdown.com",
    siteName: "Hermes",
    type: "website",
    images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hermes Markdown",
    description: "Local-first, minimalist writing.",
    images: ["/assets/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfc" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jetBrainsMono.variable} ${firaCode.variable} ${ibmPlexMono.variable}`}
    >
      <body
        className="h-full min-h-screen bg-[#fcfcfc] dark:bg-[#1a1a1a] text-neutral-900 dark:text-neutral-100 transition-colors duration-300 antialiased"
        suppressHydrationWarning
      >
        <MainPage>{children}</MainPage>
      </body>
    </html>
  );
}
