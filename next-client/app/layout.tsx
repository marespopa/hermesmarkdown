import "./globals.scss";
import MainPage from "./components/MainPage";

export const metadata = {
  metadataBase: "https://hermesmarkdown.com/",
  title: "Hermes Markdown",
  description: "A free to use, online markdown editor",
  applicationName: "Hermes Markdown",
  referrer: "origin-when-cross-origin",
  keywords: ["Editor", "Markdown", "Markdown Notes"],
  authors: [{ name: "Mares Popa", url: "https://www.marespopa.com/" }],
  creator: "Mares Popa",
  openGraph: {
    title: "Hermes Markdown",
    description: "A free to use, online markdown editor",
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
