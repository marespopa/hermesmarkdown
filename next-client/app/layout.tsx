import "./globals.scss";
import "./theme-palettes.scss";
import "./editor/editor.scss";
import "./editor/editor-typography.scss";
import MainPage from "./components/MainPage";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import InlineScript from "./components/InlineScript";
import { Metadata, Viewport } from "next";
import { plusJakarta, geistMono, jetbrainsMono, firaCode, duospace, quattro } from "./fonts";
import { HOME_TITLE, SITE_DESCRIPTION } from "./utils/page-metadata";
import { CODE_FONT_STACKS } from "./atoms/ui-atoms";
import { DARK_THEMES, DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, LEGACY_THEME_MAP, LIGHT_THEMES } from "./theme-palettes";

export const metadata: Metadata = {
  metadataBase: new URL("https://hermesmarkdown.com"),
  title: HOME_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "HermesMarkdown",
  authors: [{ name: "Mares Popa", url: "https://www.marespopa.com/" }],
  keywords: [
    "local-first markdown editor",
    "markdown editor for engineers",
    "wikilinks",
    "offline markdown editor",
    "markdown editor pwa",
    "markdown editor for safari and iPad",
    "privacy-focused editor",
    "no-cloud notes",
    "distraction-free editor",
  ],
  manifest: "/manifest.json",
  // Home-screen install on iOS: full-screen, with its own name.
  appleWebApp: {
    capable: true,
    title: "HermesMarkdown",
    statusBarStyle: "default",
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    url: "https://hermesmarkdown.com",
    siteName: "HermesMarkdown",
    type: "website",
    images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/assets/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  // The default Quartz surface; the pre-paint script and ThemeProvider
  // repaint it with the page's own --surface, so the installed app's status
  // and navigation bars follow the picked mode and palette.
  themeColor: "#F7F7F7",
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
    var theme = stored ? JSON.parse(stored) : "system";
    if (theme !== "light" && theme !== "dark" && theme !== "system") theme = "system";
    var isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) document.documentElement.classList.add("dark");
    var lightTheme = JSON.parse(localStorage.getItem("lightTheme") || "null");
    var darkTheme = JSON.parse(localStorage.getItem("darkTheme") || "null");
    // A palette from an earlier version: its closest current one. Nothing
    // picked (or unknown): the defaults. Mirrors resolveLight/DarkTheme.
    var legacy = ${JSON.stringify(LEGACY_THEME_MAP)};
    if (legacy.light[lightTheme]) lightTheme = legacy.light[lightTheme];
    if (legacy.dark[darkTheme]) darkTheme = legacy.dark[darkTheme];
    document.documentElement.dataset.lightTheme = ${JSON.stringify(LIGHT_THEMES.map((t) => t.value))}.indexOf(lightTheme) >= 0 ? lightTheme : ${JSON.stringify(DEFAULT_LIGHT_THEME)};
    document.documentElement.dataset.darkTheme = ${JSON.stringify(DARK_THEMES.map((t) => t.value))}.indexOf(darkTheme) >= 0 ? darkTheme : ${JSON.stringify(DEFAULT_DARK_THEME)};
    // The code font, when one of the offered ones (atom_codeFontFamily).
    var codeFont = JSON.parse(localStorage.getItem("codeFontFamily") || "null");
    if (${JSON.stringify(CODE_FONT_STACKS)}.indexOf(codeFont) >= 0) document.documentElement.style.setProperty("--font-code", codeFont);
    // The browser and installed-app bars in the page's color (syncThemeColor).
    var surface = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
    if (surface) {
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      if (!metas.length) {
        var meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
        metas = [meta];
      }
      for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", surface);
    }
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
      // The default palettes, so the server-rendered page already paints in
      // them; THEME_INIT_SCRIPT swaps in the reader's own picks.
      data-light-theme={DEFAULT_LIGHT_THEME}
      data-dark-theme={DEFAULT_DARK_THEME}
      className={`h-full overscroll-none ${plusJakarta.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${firaCode.variable} ${duospace.variable} ${quattro.variable}`}
    >
      <head>
        <InlineScript html={THEME_INIT_SCRIPT} />
      </head>
      <body
        className="h-full min-h-screen bg-paper-pale dark:bg-paper-dark text-ink-light dark:text-ink-dark antialiased overscroll-none"
        suppressHydrationWarning
      >
        <MainPage>{children}</MainPage>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
