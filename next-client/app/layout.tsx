import "./globals.scss";
import MainPage from "./components/MainPage";

export const metadata = {
  metadataBase: "https://hermesmarkdown.com/",
  title: "Hermes Markdown - Privacy-First Editor",
  description: "Hermes Markdown is a free, privacy-focused online markdown editor that works entirely offline. Create beautiful documents with real-time preview, professional templates, and export to PDF or HTML.",
  applicationName: "Hermes Markdown",
  referrer: "origin-when-cross-origin",
  keywords: ["Markdown Editor", "Online Editor", "Free Markdown", "Privacy", "Documentation", "Writing Tool"],
  authors: [{ name: "Mares Popa", url: "https://www.marespopa.com/" }],
  creator: "Mares Popa",
  openGraph: {
    title: "Hermes Markdown - Privacy-First Editor",
    description: "Hermes Markdown is a free, privacy-focused online markdown editor that works entirely offline. Create beautiful documents with real-time preview, professional templates, and export to PDF or HTML.",
    url: "https://hermesmarkdown.com/",
    siteName: "Hermes Markdown",
    locale: "en_US",
    type: "website",
    images: {
      url: "https://hermesmarkdown.com/_ipx/w_640,q_75/%2Fassets%2Fhero%2Fniceday%402x.jpg?url=%2Fassets%2Fhero%2Fniceday%402x.jpg&w=640&q=75",
      width: 640,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainPage>{children}</MainPage>;
}
