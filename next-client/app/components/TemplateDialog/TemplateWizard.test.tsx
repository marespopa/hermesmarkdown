import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Provider } from "jotai";
import TemplateWizard from "./TemplateWizard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function renderWizard({
  canCopyFolder = true,
  preset,
  packs = ["Work"],
}: { canCopyFolder?: boolean; preset?: React.ComponentProps<typeof TemplateWizard>["preset"]; packs?: string[] } = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <Provider>
      <TemplateWizard
        isOpen
        preset={preset}
        packs={packs}
        noteExamples={[{ id: "builtin:meetings/Meeting notes", name: "Meeting notes", description: "Agenda, decisions, action items" }]}
        folderExamples={[{ id: "project-folder", name: "Project folder" }]}
        canCopyFolder={canCopyFolder}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </Provider>,
  );
  return { onSubmit, onCancel };
}

const name = () => screen.getByLabelText("Name") as HTMLInputElement;

describe("TemplateWizard", () => {
  it("puts a note template in one of your packs, or a new one named here", () => {
    const { onSubmit } = renderWizard();
    fireEvent.change(name(), { target: { value: "Standup" } });
    fireEvent.change(screen.getByLabelText("Pack"), { target: { value: "Work" } });
    fireEvent.click(screen.getByRole("button", { name: "Create template" }));
    expect(onSubmit).toHaveBeenLastCalledWith({ kind: "note", name: "Standup", from: "blank", pack: "Work" });

    fireEvent.change(screen.getByLabelText("Pack"), { target: { value: "\u0000new" } });
    const create = screen.getByRole("button", { name: "Create template" });
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByLabelText("New pack name"), { target: { value: " Rituals " } });
    fireEvent.click(create);
    expect(onSubmit).toHaveBeenLastCalledWith({ kind: "note", name: "Standup", from: "blank", pack: "Rituals" });
  });

  it("opens on a pack (a pack's New), with no pack field for a folder template", () => {
    const { onSubmit } = renderWizard({ preset: { kind: "note", pack: "Work" } });
    expect((screen.getByLabelText("Pack") as HTMLSelectElement).value).toBe("Work");
    fireEvent.click(screen.getByRole("button", { name: "Folder" }));
    expect(screen.queryByLabelText("Pack")).not.toBeInTheDocument();
    fireEvent.change(name(), { target: { value: "Launch" } });
    fireEvent.click(screen.getByRole("button", { name: "Create template" }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: "folder", name: "Launch", from: "blank", askName: true });
  });

  it("opens on a preset example, kind and name filled in", () => {
    const { onSubmit } = renderWizard({ preset: { kind: "folder", from: "example:project-folder" } });
    expect(screen.getByRole("button", { name: "Folder" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("radio", { name: /Project folder/ })).toHaveAttribute("aria-checked", "true");
    expect(name().value).toBe("Project folder");
    fireEvent.click(screen.getByRole("button", { name: "Create template" }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: "folder", name: "Project folder", from: "example:project-folder", askName: true });
  });

  it("creates a blank note template once a name is in", () => {
    const { onSubmit } = renderWizard();
    const create = screen.getByRole("button", { name: "Create template" });
    expect(create).toBeDisabled();
    fireEvent.change(name(), { target: { value: " Release notes " } });
    fireEvent.click(create);
    expect(onSubmit).toHaveBeenCalledWith({ kind: "note", name: "Release notes", from: "blank" });
  });

  it("fills an untouched name from the example picked, never a typed one", () => {
    const { onSubmit } = renderWizard();
    fireEvent.click(screen.getByRole("radio", { name: /Meeting notes/ }));
    expect(name().value).toBe("Meeting notes");
    fireEvent.change(name(), { target: { value: "Sync" } });
    fireEvent.click(screen.getByRole("radio", { name: /Blank/ }));
    expect(name().value).toBe("Sync");
    fireEvent.click(screen.getByRole("radio", { name: /Meeting notes/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create template" }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: "note", name: "Sync", from: "example:builtin:meetings/Meeting notes" });
  });

  it("offers folder starting points and asks for the folder's name by default", () => {
    const { onSubmit } = renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Folder" }));
    expect(screen.queryByRole("radio", { name: /Meeting notes/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /A folder in your vault/ }));
    fireEvent.change(name(), { target: { value: "Client" } });
    expect(screen.getByRole("switch", { name: "Ask for the folder's name each time" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Create template" }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: "folder", name: "Client", from: "vault", askName: true });
  });

  it("can name every new folder the same", () => {
    const { onSubmit } = renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Folder" }));
    fireEvent.click(screen.getByRole("radio", { name: /Project folder/ }));
    fireEvent.click(screen.getByRole("switch", { name: "Ask for the folder's name each time" }));
    fireEvent.click(screen.getByRole("button", { name: "Create template" }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: "folder", name: "Project folder", from: "example:project-folder", askName: false });
  });

  it("leaves out copying a vault folder when there is none", () => {
    renderWizard({ canCopyFolder: false });
    fireEvent.click(screen.getByRole("button", { name: "Folder" }));
    expect(screen.queryByRole("radio", { name: /A folder in your vault/ })).not.toBeInTheDocument();
  });

  it("cancels", () => {
    const { onCancel, onSubmit } = renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
