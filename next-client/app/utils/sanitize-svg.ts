// Sanitise an SVG file for an <img>. The svg profile drops <script> and on*
// handlers; the hooks below also drop remote references (an href that isn't
// a #fragment or a raster data: image, CSS @import and url() to anywhere
// else), so showing the file can't fetch anything. null means its bytes
// can't be made safe, or nothing is left to draw.

const SAFE_REF = /^(#|data:image\/(?!svg))/i;
const REMOTE_URL = /url\(\s*(['"]?)(?!\s*#|data:image\/(?!svg))[^)]*\)/gi;

const cleanCss = (css: string) => css.replace(/@import[^;{}]*;?/gi, "").replace(REMOTE_URL, "none");

type HookNode = Element & { textContent: string | null };

function stripRemote(node: HookNode) {
  for (const name of ["href", "xlink:href"]) {
    const value = node.getAttribute?.(name);
    if (value !== null && value !== undefined && !SAFE_REF.test(value.trim())) node.removeAttribute(name);
  }
  const style = node.getAttribute?.("style");
  if (style) node.setAttribute("style", cleanCss(style));
  if (node.nodeName.toLowerCase() === "style" && node.textContent) node.textContent = cleanCss(node.textContent);
}

export async function sanitizeSvgText(file: File): Promise<string | null> {
  try {
    const { default: DOMPurify } = await import("dompurify");
    const onElement = (node: Node) => stripRemote(node as HookNode);
    const onAttributes = (node: Element) => stripRemote(node as HookNode);
    DOMPurify.addHook("afterSanitizeAttributes", onAttributes);
    DOMPurify.addHook("uponSanitizeElement", onElement);
    let clean: string;
    try {
      clean = DOMPurify.sanitize(await file.text(), { USE_PROFILES: { svg: true, svgFilters: true } });
    } finally {
      DOMPurify.removeHook("afterSanitizeAttributes", onAttributes);
      DOMPurify.removeHook("uponSanitizeElement", onElement);
    }
    const drawn = /<svg[\s>]/i.test(clean) && !/^<svg[^>]*>\s*<\/svg>$/i.test(clean.trim());
    return drawn ? clean : null;
  } catch {
    return null;
  }
}

/** A blob URL for the sanitised SVG, or null. The caller revokes it. */
export async function sanitizeSvg(file: File): Promise<string | null> {
  const clean = await sanitizeSvgText(file);
  return clean && URL.createObjectURL(new Blob([clean], { type: "image/svg+xml" }));
}
