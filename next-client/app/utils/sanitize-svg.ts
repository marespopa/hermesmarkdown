// Sanitise an SVG file for an <img>. The svg profile drops <script>, on* handlers
// and remote references; null means its bytes can't be made safe.
export async function sanitizeSvgText(file: File): Promise<string | null> {
  try {
    const { default: DOMPurify } = await import("dompurify");
    const clean = DOMPurify.sanitize(await file.text(), { USE_PROFILES: { svg: true, svgFilters: true } });
    return clean?.trim() ? clean : null;
  } catch {
    return null;
  }
}

/** A blob URL for the sanitised SVG, or null. The caller revokes it. */
export async function sanitizeSvg(file: File): Promise<string | null> {
  const clean = await sanitizeSvgText(file);
  return clean && URL.createObjectURL(new Blob([clean], { type: "image/svg+xml" }));
}
