import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "jotai";
import ProjectCheckSettings from "./ProjectCheckSettings";

const pair = vi.fn();
const disconnect = vi.fn();
const paired = vi.fn();
vi.mock("@/app/services/project-check-helper-client", () => ({
  pairProjectCheckHelper: (...args: unknown[]) => pair(...args),
  disconnectProjectCheckHelper: () => disconnect(),
  projectCheckPairing: () => paired(),
}));
function Wrapper({ children }: { children: React.ReactNode }) { return <Provider>{children}</Provider>; }

describe("ProjectCheckSettings", () => {
  beforeEach(() => { vi.clearAllMocks(); paired.mockReturnValue({ paired: false, projectRoot: null }); });
  it("pairs with a one-time code and displays the selected project", async () => {
    pair.mockResolvedValue({ projectRoot: "/work/next-client" });
    paired.mockReturnValueOnce({ paired: false, projectRoot: null }).mockReturnValue({ paired: true, projectRoot: "/work/next-client" });
    render(<ProjectCheckSettings />, { wrapper: Wrapper });
    fireEvent.change(screen.getByRole("textbox", { name: "Helper pairing code" }), { target: { value: "once" } });
    fireEvent.click(screen.getByRole("button", { name: "Pair helper" }));
    await waitFor(() => expect(pair).toHaveBeenCalledWith("once"));
    expect(await screen.findByText(/Paired project: \/work\/next-client/)).toBeInTheDocument();
  });
  it("reports pairing failure without exposing an external service", async () => {
    pair.mockRejectedValue(new Error("offline"));
    render(<ProjectCheckSettings />, { wrapper: Wrapper });
    fireEvent.change(screen.getByRole("textbox", { name: "Helper pairing code" }), { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: "Pair helper" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
  });
  it("disconnects the in-memory pairing token", () => {
    paired.mockReturnValue({ paired: true, projectRoot: "/work" });
    render(<ProjectCheckSettings />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Disconnect helper" }));
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
