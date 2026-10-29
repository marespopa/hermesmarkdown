import { beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizeSvg } from "./sanitize-svg";

const svgFile = (contents: string) => ({ lastModified: 1, text: async () => contents }) as unknown as File;

async function sanitizedBlob(): Promise<Blob> {
  const blob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0] as Blob;
  return blob;
}

describe("sanitizeSvg", () => {
  beforeEach(() => {
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:svg"), revokeObjectURL: vi.fn() });
  });

  it("strips a <script> tag", async () => {
    const url = await sanitizeSvg(svgFile(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>`));
    expect(url).toBe("blob:svg");
    expect(await (await sanitizedBlob()).text()).not.toContain("<script");
  });

  it("strips an onload handler", async () => {
    await sanitizeSvg(svgFile(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert('x')"><rect width="1" height="1"/></svg>`));
    expect(await (await sanitizedBlob()).text()).not.toContain("onload");
  });

  it("strips a remote tracking image", async () => {
    await sanitizeSvg(svgFile(`<svg xmlns="http://www.w3.org/2000/svg"><image href="http://attacker.test/track"/></svg>`));
    expect(await (await sanitizedBlob()).text()).not.toContain("http://attacker.test/track");
  });

  it("strips an import rule in a style block", async () => {
    await sanitizeSvg(svgFile(`<svg xmlns="http://www.w3.org/2000/svg"><style>@import "http://attacker.test/leak.css";</style></svg>`));
    expect(await (await sanitizedBlob()).text()).not.toContain("@import");
  });

  it("keeps a plain shape", async () => {
    const clean = `<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="red"/></svg>`;
    await sanitizeSvg(svgFile(clean));
    expect(await (await sanitizedBlob()).text()).toContain("<rect");
  });

  it("returns null when nothing usable survives", async () => {
    expect(await sanitizeSvg(svgFile(""))).toBeNull();
    expect(await sanitizeSvg(svgFile("plain text"))).toBeNull();
    expect(await sanitizeSvg(svgFile(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`))).toBeNull();
  });
});
