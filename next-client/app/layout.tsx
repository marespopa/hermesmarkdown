import "./globals.scss";
import MainPage from "./components/MainPage";
import { Metadata, Viewport } from "next";
import { inter, jetBrainsMono, firaCode, ibmPlexMono } from "./fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://hermesmarkdown.com"),
  title: "HermesMarkdown — The Agent-Readable Workspace for Engineers",
  description:
    "A local-first, privacy-centric Markdown editor for software engineers and AI practitioners. Smart Workspaces, WikiLinks, frontmatter schemas, table editor, and more — your data never leaves your device.",
  applicationName: "HermesMarkdown",
  authors: [{ name: "Mares Popa", url: "https://www.marespopa.com/" }],
  keywords: [
    "local-first markdown editor",
    "agent-readable workspace",
    "markdown for engineers",
    "AI-readable notes",
    "frontmatter schema",
    "smart workspaces",
    "wikilinks",
    "offline markdown editor",
    "privacy-focused editor",
    "no-cloud notes",
    "distraction-free editor",
    "RAG knowledge base",
  ],
  manifest: "/manifest.json",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    title: "HermesMarkdown — The Agent-Readable Workspace for Engineers",
    description:
      "Local-first Markdown with frontmatter schemas, Smart Workspaces, WikiLinks, and a table editor. Built for engineers and AI workflows. Your data never leaves your device.",
    url: "https://hermesmarkdown.com",
    siteName: "HermesMarkdown",
    type: "website",
    images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HermesMarkdown — The Agent-Readable Workspace for Engineers",
    description:
      "Local-first Markdown with frontmatter schemas, Smart Workspaces, WikiLinks, and a table editor. No cloud, no tracking.",
    images: ["/assets/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFCFA" },
    { media: "(prefers-color-scheme: dark)", color: "#2C2C2C" },
  ],
  width: "device-width",
  initialScale: 1,
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored ? JSON.parse(stored) : null;
    if (theme !== "light" && theme !== "dark") {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      localStorage.setItem("theme", JSON.stringify(theme));
    }
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full overscroll-none ${inter.variable} ${jetBrainsMono.variable} ${firaCode.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className="h-full min-h-screen bg-paper-pale dark:bg-paper-dark text-ink-light dark:text-ink-dark transition-colors duration-300 antialiased overscroll-none"
        suppressHydrationWarning
      >
        <MainPage>{children}</MainPage>
      </body>
    </html>
  );
}
