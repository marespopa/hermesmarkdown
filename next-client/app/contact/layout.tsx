import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — HermesMarkdown",
  description:
    "Get in touch with the HermesMarkdown team. Feature requests, bug reports, or just to say hello.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact — HermesMarkdown",
    description: "Reach out to the HermesMarkdown team.",
    url: "https://hermesmarkdown.com/contact",
    siteName: "HermesMarkdown",
    type: "website",
    images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact — HermesMarkdown",
    description: "Reach out to the HermesMarkdown team.",
    images: ["/assets/og-image.jpg"],
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
