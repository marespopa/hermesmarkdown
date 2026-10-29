// JSON for a <script type="application/ld+json">, with `<` escaped so text
// can never close the script tag.
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
