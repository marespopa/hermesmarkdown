import "./globals.scss";
import MainPage from "./components/MainPage";
import { Metadata, Viewport } from "next";
import { inter, ibmPlexMono, spaceMono, ibmPlexSans, literata } from "./fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://hermesmarkdown.com"),
  title: "HermesMarkdown — Runs in Browser, Files Stay on Disk",
  description:
    "Edit local Markdown folders in your browser — reads and writes files directly on disk. Nothing touches a server. No accounts, no cloud uploads.",
  applicationName: "HermesMarkdown",
  authors: [{ name: "Mares Popa", url: "https://www.marespopa.com/" }],
  keywords: [
    "context engineering",
    "context engineering for notes",
    "local-first markdown editor",
    "agent-readable workspace",
    "markdown editor for engineers",
    "AGENTS.md",
    "AI-readable notes",
    "frontmatter schema",
    "agent context protocol",
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
    title: "HermesMarkdown — Runs in Browser, Files Stay on Disk",
    description:
      "Edit local Markdown folders in your browser — reads and writes files directly on disk. Nothing touches a server. No accounts, no cloud uploads.",
    url: "https://hermesmarkdown.com",
    siteName: "HermesMarkdown",
    type: "website",
    images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HermesMarkdown — Runs in Browser, Files Stay on Disk",
    description:
      "Edit local Markdown folders in your browser — reads and writes files directly on disk. Nothing touches a server. No accounts, no cloud uploads.",
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
  // Without this, Android Chrome overlays the on-screen keyboard instead of
  // shrinking the layout viewport — visualViewport never reports a shrink,
  // so fixed/bottom-anchored UI and scroll-to-caret both stay covered.
  interactiveWidget: "resizes-content",
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
      className={`h-full overscroll-none ${inter.variable} ${ibmPlexMono.variable} ${spaceMono.variable} ${ibmPlexSans.variable} ${literata.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className="h-full min-h-screen bg-paper-pale dark:bg-paper-dark text-ink-light dark:text-ink-dark antialiased overscroll-none"
        suppressHydrationWarning
      >
        <MainPage>{children}</MainPage>
      </body>
    </html>
  );
}
