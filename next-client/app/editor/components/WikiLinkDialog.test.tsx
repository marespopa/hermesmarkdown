import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import WikiLinkDialog from "./WikiLinkDialog";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const meta = (path: string) => ({ path, name: path.split("/").pop()! }) as FileMetadata;

function renderDialog(props: Partial<React.ComponentProps<typeof WikiLinkDialog>> = {}, paths = ["templates/Meeting notes.md", "templates/Spec.md", "notes/a.md"]) {
  const store = createStore();
  store.set(atom_fileMetadata, Object.fromEntries(paths.map((p) => [p, meta(p)])));
  const onConfirm = vi.fn();
  const onCreateFromTemplate = vi.fn().mockResolvedValue("meetings/Meeting notes 2026-10-05");
  render(
    <Provider store={store}>
      <WikiLinkDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onCreateAndConfirm={vi.fn()}
        onCreateFromTemplate={onCreateFromTemplate}
        {...props}
      />
    </Provider>,
  );
  return { onConfirm, onCreateFromTemplate };
}

describe("WikiLinkDialog, From template", () => {
  it("preselects the template the name points to, carrying over the typed name", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("Search existing notes"), { target: { value: "Meeting notes 2026-10-05" } });
    fireEvent.click(screen.getByRole("tab", { name: "From template" }));
    expect(screen.getByLabelText("New note name")).toHaveValue("Meeting notes 2026-10-05");
    expect(screen.getByRole("radio", { name: /Meeting notes/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Suggested")).toBeInTheDocument();
  });

  it("creates from the chosen template and links the new note", async () => {
    const { onConfirm, onCreateFromTemplate } = renderDialog();
    fireEvent.click(screen.getByRole("tab", { name: "From template" }));
    fireEvent.change(screen.getByLabelText("New note name"), { target: { value: "Login" } });
    expect(screen.getByRole("button", { name: "Create from template and link" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Spec/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create from template and link" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("meetings/Meeting notes 2026-10-05"));
    expect(onCreateFromTemplate).toHaveBeenCalledWith("Login", { name: "Spec", path: "templates/Spec.md" });
  });

  it("has no From template tab without templates", () => {
    renderDialog({}, ["notes/a.md"]);
    expect(screen.queryByRole("tab", { name: "From template" })).not.toBeInTheDocument();
  });

  it("has no From template tab when creating from templates isn't offered", () => {
    renderDialog({ onCreateFromTemplate: undefined });
    expect(screen.queryByRole("tab", { name: "From template" })).not.toBeInTheDocument();
  });
});
