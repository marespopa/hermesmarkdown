import "./globals.scss";
import MainPage from "./components/MainPage";
import { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://hermesmarkdown.com"),
  title: "Hermes Markdown — Privacy-First Editor",
  description: "A free, privacy-focused online markdown editor that works entirely offline. Create beautiful documents with real-time preview and professional prompt-drafting templates.",
  applicationName: "Hermes Markdown",
  authors: [{ name: "Mares Popa", url: "https://www.marespopa.com/" }],
  openGraph: {
    title: "Hermes Markdown — Privacy-First Editor",
    description: "Write securely with a local-first markdown experience. No tracking, no cloud syncing.",
    url: "https://hermesmarkdown.com/",
    siteName: "Hermes Markdown",
    type: "website",
    images: [{ url: "/assets/hero/niceday@2x.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hermes Markdown — Privacy-First Editor",
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
