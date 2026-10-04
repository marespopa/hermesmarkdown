import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Provider } from "jotai";
import TemplatePromptForm from "./TemplatePromptForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function renderForm() {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <Provider>
      <TemplatePromptForm isOpen labels={["Owner", "Due date"]} confirmLabel="Create" onSubmit={onSubmit} onCancel={onCancel} />
    </Provider>,
  );
  return { onSubmit, onCancel };
}

describe("TemplatePromptForm", () => {
  it("shows one field per label", () => {
    renderForm();
    expect(screen.getByLabelText("Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Due date")).toBeInTheDocument();
  });

  it("submits every value on Enter, empty answers included", () => {
    const { onSubmit } = renderForm();
    const owner = screen.getByLabelText("Owner");
    fireEvent.change(owner, { target: { value: "Ana" } });
    owner.focus();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith({ Owner: "Ana", "Due date": "" });
  });

  it("submits from the confirm button", () => {
    const { onSubmit } = renderForm();
    fireEvent.click(screen.getByText("Create"));
    expect(onSubmit).toHaveBeenCalledWith({ Owner: "", "Due date": "" });
  });

  it("cancels from the Cancel button and on Escape", () => {
    const { onCancel, onSubmit } = renderForm();
    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
