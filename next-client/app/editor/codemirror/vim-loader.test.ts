import { describe, expect, it } from "vitest";
import { loadedVim, loadVim } from "./vim-loader";

describe("vim-loader", () => {
  it("has nothing until Vim is asked for, then loads it once", async () => {
    expect(loadedVim()).toBeNull();

    const [first, second] = await Promise.all([loadVim(), loadVim()]);
    expect(first).toBe(second);
    expect(typeof first.vim).toBe("function");
    expect(loadedVim()).toBe(first);
  });
});
