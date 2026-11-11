import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildToolHandoff, HANDOFF_TTL_MS, TOOL_HANDOFF_KEY } from "@/app/utils/tool-handoff";
import { useToolHandoff } from "./use-tool-handoff";

function storeHandoff(createdAt = Date.now()) {
  const handoff = buildToolHandoff("mermaid", "Mermaid diagram", "# Mermaid diagram\n", createdAt);
  sessionStorage.setItem(TOOL_HANDOFF_KEY, JSON.stringify(handoff));
}

function setup(isVaultLocked = false) {
  const offerDraft = vi.fn();
  const hook = renderHook(({ locked }) => useToolHandoff({ offerDraft, isVaultLocked: locked }), {
    initialProps: { locked: isVaultLocked },
  });
  return { offerDraft, ...hook };
}

describe("useToolHandoff", () => {
  afterEach(() => sessionStorage.clear());

  it("does nothing without a handoff", () => {
    const { offerDraft } = setup();
    expect(offerDraft).not.toHaveBeenCalled();
  });

  it("waits while the vault is locked, then offers once and clears the key", () => {
    storeHandoff();
    const { offerDraft, rerender } = setup(true);
    expect(offerDraft).not.toHaveBeenCalled();

    rerender({ locked: false });
    expect(offerDraft).toHaveBeenCalledWith({ text: "# Mermaid diagram\n", name: "Mermaid diagram", origin: "tool" });
    expect(sessionStorage.getItem(TOOL_HANDOFF_KEY)).toBeNull();

    rerender({ locked: false });
    expect(offerDraft).toHaveBeenCalledTimes(1);
  });

  it("drops an expired handoff", () => {
    storeHandoff(Date.now() - HANDOFF_TTL_MS - 1000);
    const { offerDraft } = setup();
    expect(offerDraft).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(TOOL_HANDOFF_KEY)).toBeNull();
  });
});
