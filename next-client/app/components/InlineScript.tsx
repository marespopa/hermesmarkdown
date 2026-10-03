"use client";

// An inline script that runs once, while the browser parses the server HTML
// (e.g. to set the theme class before the first paint). React warns in
// development when it renders an executable <script> on the client, and never
// runs one, so the client renders it as inert `text/plain`;
// `suppressHydrationWarning` accepts the type difference. Pattern from the
// Next.js "Preventing flash before hydration" guide. A Client Component on
// purpose: as a Server Component, the `typeof window` check would only ever
// run on the server, and the client would get `text/javascript` anyway.
export default function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
