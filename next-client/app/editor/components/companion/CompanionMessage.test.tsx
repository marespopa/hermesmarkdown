import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import CompanionMessage from "./CompanionMessage";
import type { CompanionMessage as Message } from "./companion-messages";

const reply: Message = {
  id: "a1",
  role: "assistant",
  parts: [
    { type: "text", text: "Adding the types." },
    { type: "tool-read_file", toolCallId: "r", state: "output-available", input: { path: "src/a.ts" }, output: "x" },
    { type: "tool-edit_file", toolCallId: "e", state: "output-error", input: { path: "src/a.ts" }, errorText: "no" },
  ] as unknown as Message["parts"],
};

const renderMessage = () => render(<Provider><CompanionMessage message={reply} activities={{}} /></Provider>);

describe("CompanionMessage", () => {
  it("shows the progress text, not the tool calls", () => {
    renderMessage();

    expect(screen.getByText("Adding the types.")).toBeTruthy();
    expect(screen.queryByText(/Read src\/a\.ts/)).toBeNull();
  });

  it("shows the hidden steps when asked", () => {
    renderMessage();

    fireEvent.click(screen.getByRole("button", { name: "Show 2 steps" }));

    expect(screen.getByText(/Read src\/a\.ts/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hide 2 steps" })).toBeTruthy();
  });
});
