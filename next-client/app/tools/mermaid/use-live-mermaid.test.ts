import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveMermaid } from "./use-live-mermaid";

const mermaid = vi.hoisted(() => ({ renderMermaid: vi.fn() }));
vi.mock("@/app/editor/utils/render-mermaid", () => mermaid);

async function settle(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useLiveMermaid", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mermaid.renderMermaid.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("renders once typing pauses", async () => {
    mermaid.renderMermaid.mockResolvedValue("<svg>A</svg>");
    const { result, rerender } = renderHook(({ source }) => useLiveMermaid(source), { initialProps: { source: "graph TD" } });
    rerender({ source: "graph TD\nA" });
    await settle(399);
    expect(mermaid.renderMermaid).not.toHaveBeenCalled();
    await settle(1);
    expect(mermaid.renderMermaid).toHaveBeenCalledTimes(1);
    expect(mermaid.renderMermaid).toHaveBeenCalledWith("graph TD\nA", "default");
    expect(result.current).toEqual({ svg: "<svg>A</svg>", error: null, loading: false });
  });

  it("keeps the last good diagram when the source breaks", async () => {
    mermaid.renderMermaid.mockResolvedValueOnce("<svg>A</svg>").mockRejectedValueOnce(new Error("Parse error"));
    const { result, rerender } = renderHook(({ source }) => useLiveMermaid(source), { initialProps: { source: "graph TD" } });
    await settle(400);
    rerender({ source: "graph T" });
    await settle(400);
    expect(result.current).toEqual({ svg: "<svg>A</svg>", error: "Parse error", loading: false });
  });

  it("clears to nothing for an empty source, without rendering", async () => {
    const { result } = renderHook(() => useLiveMermaid("  "));
    await settle(400);
    expect(mermaid.renderMermaid).not.toHaveBeenCalled();
    expect(result.current).toEqual({ svg: null, error: null, loading: false });
  });
});
