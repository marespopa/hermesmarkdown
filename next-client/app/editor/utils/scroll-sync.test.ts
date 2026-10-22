import { describe, it, expect } from "vitest";
import { anchorScrollTop, ratioScrollTop } from "./scroll-sync";

describe("ratioScrollTop", () => {
  it("maps the same fraction of the range", () => {
    const src = { scrollTop: 250, scrollHeight: 1000, clientHeight: 500 };
    const dst = { scrollTop: 0, scrollHeight: 2000, clientHeight: 1000 };
    expect(ratioScrollTop(src, dst)).toBe(500);
  });

  it("counts a source that cannot scroll as 0", () => {
    const src = { scrollTop: 0, scrollHeight: 300, clientHeight: 500 };
    const dst = { scrollTop: 0, scrollHeight: 2000, clientHeight: 1000 };
    expect(ratioScrollTop(src, dst)).toBe(0);
  });

  it("returns 0 for a target that cannot scroll", () => {
    const src = { scrollTop: 250, scrollHeight: 1000, clientHeight: 500 };
    expect(ratioScrollTop(src, { scrollTop: 0, scrollHeight: 400, clientHeight: 500 })).toBe(0);
  });

  it("clamps an overscrolled source", () => {
    const src = { scrollTop: 900, scrollHeight: 1000, clientHeight: 500 };
    const dst = { scrollTop: 0, scrollHeight: 1500, clientHeight: 500 };
    expect(ratioScrollTop(src, dst)).toBe(1000);
  });
});

describe("anchorScrollTop", () => {
  it("aligns the same line and fraction with different block heights", () => {
    // Source: the aligned point (viewport 500) is doc y 1000, 20px into a
    // 100px line starting at doc y 980.
    const srcView = {
      documentTop: -500,
      lineBlockAtHeight: () => ({ from: 42, top: 980, height: 100 }) as never,
    };
    // Destination: the same line is 200px tall at doc y 1000.
    const dstView = {
      documentTop: -300,
      lineBlockAt: (pos: number) => ({ from: pos, top: 1000, height: 200 }) as never,
    };
    const result = anchorScrollTop({ srcView, srcTop: 500, dstView, dstTop: 48, dstScrollTop: 300 });
    // frac 0.2 → destination y 1000 + 0.2 * 200 = 1040;
    // 300 + (-300 + 1040) - 48 = 992.
    expect(result).toBe(992);
  });

  it("uses the fraction into the line", () => {
    const srcView = {
      documentTop: 0,
      lineBlockAtHeight: () => ({ from: 7, top: 100, height: 50 }) as never,
    };
    const dstView = {
      documentTop: 0,
      lineBlockAt: () => ({ from: 7, top: 400, height: 100 }) as never,
    };
    // srcTop 125 → frac 0.5 → y 450 → scrollTop = 0 + 450 - 0.
    expect(anchorScrollTop({ srcView, srcTop: 125, dstView, dstTop: 0, dstScrollTop: 0 })).toBe(450);
  });
});
