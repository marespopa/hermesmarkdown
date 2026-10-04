import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createStore, Provider } from "jotai";
import { atom_vaultDescriptor } from "@/app/atoms/vault-atoms";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_templateFolderSettings, atom_templates } from "@/app/atoms/template-atoms";
import TemplatesFolderSetting from "./TemplatesFolderSetting";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function meta(path: string): FileMetadata {
  return { path, name: path.split("/").pop()!, tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 0, tasks: [], handle: null };
}

function setup(vaultId: string | null = "v1", initialSettings?: Record<string, string>) {
  const store = createStore();
  if (vaultId) store.set(atom_vaultDescriptor, { kind: "browser", id: vaultId } as any);
  if (initialSettings) store.set(atom_templateFolderSettings, initialSettings);
  store.set(atom_fileMetadata, {
    "templates/rfc.md": meta("templates/rfc.md"),
    "_tpl/meeting.md": meta("_tpl/meeting.md"),
  });
  render(<Provider store={store}><TemplatesFolderSetting /></Provider>);
  return { store, input: screen.getByLabelText("Templates folder") as HTMLInputElement };
}

describe("TemplatesFolderSetting", () => {
  beforeEach(() => localStorage.clear());

  it("shows the folder in use as the placeholder", () => {
    const { input } = setup();
    expect(input.placeholder).toBe("templates");
  });

  it("saves the normalized folder for this vault on blur and switches the templates", () => {
    const { store, input } = setup();
    fireEvent.change(input, { target: { value: " /_tpl/ " } });
    fireEvent.blur(input);
    expect(store.get(atom_templateFolderSettings)).toEqual({ "browser:v1": "_tpl" });
    expect(input.value).toBe("_tpl");
    expect(store.get(atom_templates).map((t) => t.name)).toEqual(["meeting"]);
  });

  it("deletes the vault's key when cleared", () => {
    const { store, input } = setup("v1", { "browser:v1": "_tpl", "browser:other": "x" });
    expect(input.value).toBe("_tpl");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(store.get(atom_templateFolderSettings)).toEqual({ "browser:other": "x" });
  });

  it("rejects dot folders with a hint and keeps the setting", () => {
    const { store, input } = setup();
    fireEvent.change(input, { target: { value: ".hermes/tpl" } });
    fireEvent.blur(input);
    expect(screen.getByRole("alert")).toHaveTextContent("aren't indexed");
    expect(store.get(atom_templateFolderSettings)).toEqual({});
  });

  it("is disabled without a vault", () => {
    const { input } = setup(null);
    expect(input).toBeDisabled();
  });
});
