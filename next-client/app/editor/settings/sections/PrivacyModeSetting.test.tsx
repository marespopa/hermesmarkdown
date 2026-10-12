import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Provider, createStore } from "jotai";
import { atom_privacyLevel } from "@/app/atoms/privacy-atoms";
import PrivacyModeSetting from "./PrivacyModeSetting";

describe("PrivacyModeSetting", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  const renderSetting = () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <PrivacyModeSetting />
      </Provider>,
    );
    return store;
  };

  it("sets the privacy level and persists it", () => {
    const store = renderSetting();

    expect(screen.getByText("Privacy Mode")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide from lists" }));
    expect(store.get(atom_privacyLevel)).toBe("hidden");
    expect(JSON.parse(window.localStorage.getItem("hermes_privacy_mode") ?? "null")).toBe("hidden");

    expect(screen.queryByRole("button", { name: "Blur previews" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mask in lists" }));
    expect(store.get(atom_privacyLevel)).toBe("show_title");
  });

  it("names the one private marker and no other", () => {
    renderSetting();

    expect(screen.getByText(/private: true or a private tag/)).toBeInTheDocument();
    expect(screen.queryByText(/sensitive/i)).not.toBeInTheDocument();
  });
});
