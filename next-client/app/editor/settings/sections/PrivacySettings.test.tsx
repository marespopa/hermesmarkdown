import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Provider, createStore } from "jotai";
import { atom_privacyLevel } from "@/app/atoms/privacy-atoms";
import PrivacySettings from "./PrivacySettings";

describe("PrivacySettings", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("sets the privacy level and persists it", () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <PrivacySettings />
      </Provider>,
    );

    expect(screen.getByText("Privacy Mode")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide notes" }));
    expect(store.get(atom_privacyLevel)).toBe("hidden");
    expect(JSON.parse(window.localStorage.getItem("hermes_privacy_mode") ?? "null")).toBe("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Blur previews" }));
    expect(store.get(atom_privacyLevel)).toBe("blurred");
  });
});
