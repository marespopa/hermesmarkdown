// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { flushAllBoardWrites, flushBoardWrite, registerBoardFlush } from "./board-flush";

describe("board flush registry", () => {
  it("flushes one path or all of them", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = registerBoardFlush("a.md", a);
    const offB = registerBoardFlush("b.md", b);
    flushBoardWrite("a.md");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    flushAllBoardWrites();
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(1);
    offA();
    offB();
  });

  it("stops flushing after unregister", () => {
    const a = vi.fn();
    registerBoardFlush("a.md", a)();
    flushBoardWrite("a.md");
    flushAllBoardWrites();
    expect(a).not.toHaveBeenCalled();
  });

  it("keeps a newer registration when an older one unregisters", () => {
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = registerBoardFlush("a.md", first);
    const offSecond = registerBoardFlush("a.md", second);
    offFirst();
    flushBoardWrite("a.md");
    expect(second).toHaveBeenCalled();
    offSecond();
  });
});
