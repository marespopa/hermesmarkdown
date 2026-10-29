import { describe, expect, it, vi } from "vitest";
import { clipCode, imageUrlFor, MAX_CODE_LINES } from "./embed-files";

describe("clipCode", () => {
  it("keeps short files whole and clips long ones", () => {
    expect(clipCode("a\nb\n")).toEqual({ code: "a\nb", more: 0 });
    const long = Array.from({ length: MAX_CODE_LINES + 5 }, (_, i) => String(i)).join("\n");
    const clipped = clipCode(long);
    expect(clipped.code.split("\n")).toHaveLength(MAX_CODE_LINES);
    expect(clipped.more).toBe(5);
  });
});

describe("imageUrlFor", () => {
  it("makes a new URL only when the file changed, revoking the old one", async () => {
    let n = 0;
    const createObjectURL = vi.fn(() => `blob:${++n}`);
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const file = (lastModified: number) => ({ lastModified } as File);

    const first = await imageUrlFor({ path: "assets/chart.png", file: file(1) });
    expect(await imageUrlFor({ path: "assets/chart.png", file: file(1) })).toBe(first);
    const second = await imageUrlFor({ path: "assets/chart.png", file: file(2) });
    expect(second).not.toBe(first);
    expect(revokeObjectURL).toHaveBeenCalledWith(first);
  });
});
