import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { describe, expect, it, vi } from "vitest";
import ProjectCheckApproval from "./ProjectCheckApproval";

const state = { toolCallId: "call-1", checkId: "typecheck" as const, label: "TypeScript typecheck", argv: ["corepack", "yarn", "tsc", "--noEmit"], projectRoot: "/work/app", timeoutMs: 120000, status: "approval" as const, output: "" };
const renderCard = (onApprove = vi.fn(), onDeny = vi.fn()) => render(<Provider><ProjectCheckApproval state={state} onApprove={onApprove} onDeny={onDeny} /></Provider>);

describe("ProjectCheckApproval", () => {
  it("shows the command and execution boundary before approval", () => {
    renderCard();
    expect(screen.getByText("corepack yarn tsc --noEmit")).toBeInTheDocument();
    expect(screen.getByText("/work/app")).toBeInTheDocument();
    expect(screen.getByText(/not an OS sandbox/)).toBeInTheDocument();
  });
  it("forwards an explicit approval or denial", () => {
    const approve = vi.fn();
    const deny = vi.fn();
    renderCard(approve, deny);
    fireEvent.click(screen.getByRole("button", { name: "Approve and run" }));
    fireEvent.click(screen.getByRole("button", { name: "Deny" }));
    expect(approve).toHaveBeenCalledOnce();
    expect(deny).toHaveBeenCalledOnce();
  });
});
