import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import SkillSettings from "./SkillSettings";

vi.mock("@/app/editor/components/ai-chat/SkillWizard", () => ({ default: ({ open, skillPath }: { open: boolean; skillPath?: string }) => open ? <div role="dialog">{skillPath ?? "new skill"}</div> : null }));
function Wrapper({ children }: { children: React.ReactNode }) { return <Provider>{children}</Provider>; }

describe("SkillSettings", () => {
  it("opens the wizard to create a skill", () => {
    render(<SkillSettings />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Create skill" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("new skill");
  });
  it("lists skill notes and opens their selected path for editing", () => {
    const store = createStore();
    store.set(atom_fileMetadata, { "Skills/Review.md": { path: "Skills/Review.md", name: "Review.md", tags: [], links: [], frontmatter: { type: "skill" }, modifiedAt: 0, wordCount: 0, tasks: [], handle: null } });
    render(<Provider store={store}><SkillSettings /></Provider>);
    expect(screen.getByText("Skills/Review.md")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Skills/Review.md");
  });
});
