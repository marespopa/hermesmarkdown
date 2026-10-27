import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Provider, createStore } from "jotai";
import { atom_terminalHost, atom_terminalUser } from "@/app/atoms/ui-atoms";
import TerminalSettings from "./TerminalSettings";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderWith(setup: (store: ReturnType<typeof createStore>) => void = () => {}) {
  const store = createStore();
  setup(store);
  render(
    <Provider store={store}>
      <TerminalSettings />
    </Provider>
  );
  return store;
}

describe("TerminalSettings", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("defaults to localhost with no user", () => {
    renderWith();
    expect(screen.getByLabelText("Terminal user")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Terminal host")).toHaveProperty("value", "localhost");
    expect(screen.getByText("Open Terminal opens ssh://localhost")).toBeTruthy();
  });

  it("updates the user and trims it on blur", () => {
    const store = renderWith();
    const input = screen.getByLabelText("Terminal user");
    fireEvent.change(input, { target: { value: "  dev  " } });
    expect(store.get(atom_terminalUser)).toBe("  dev  ");
    fireEvent.blur(input);
    expect(store.get(atom_terminalUser)).toBe("dev");
  });

  it("updates the host, trims it on blur and shows the URI", () => {
    const store = renderWith((s) => s.set(atom_terminalUser, "dev"));
    const input = screen.getByLabelText("Terminal host");
    fireEvent.change(input, { target: { value: " build.local " } });
    fireEvent.blur(input);
    expect(store.get(atom_terminalHost)).toBe("build.local");
    expect(screen.getByText("Open Terminal opens ssh://dev@build.local")).toBeTruthy();
  });

  it("asks for a host when the host is invalid", () => {
    renderWith((s) => s.set(atom_terminalHost, "my host"));
    expect(screen.getByLabelText("Terminal host").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/Enter a host name or IP address/)).toBeTruthy();
    expect(screen.queryByText(/Open Terminal opens/)).toBeNull();
  });

  it("explains the SSH handler and what the target needs", () => {
    renderWith();
    expect(screen.getByText(/default SSH app/)).toBeTruthy();
    expect(screen.getByText(/Remote Login on macOS/)).toBeTruthy();
  });
});
