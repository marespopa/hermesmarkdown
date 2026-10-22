import { render, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "jotai";
import MarkdownEditor from "./MarkdownEditor";
import "@testing-library/jest-dom";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// The pane's floating title sits in the top room (`--pane-top-room`, PaneLeaf):
// the first line, a frontmatter Properties row included, must start below it
// jsdom has no layout, so the sheet's top padding
// is checked as the rule it is: never less than the room.
describe("MarkdownEditor top room", () => {
  beforeEach(() => cleanup());

  const sheetFor = async () => {
    const { container } = render(
      <Provider>
        <MarkdownEditor value={"---\ntitle: Board\n---\n\ntext"} onChange={vi.fn()} />
      </Provider>,
    );
    await waitFor(() => expect(container.querySelector(".cm-content")).not.toBeNull());
    return container.querySelector<HTMLElement>(".editor-sheet")!;
  };

  it("keeps the first line below the pane title", async () => {
    const sheet = await sheetFor();
    expect(sheet.className).toContain("pt-[max(var(--sheet-pad-top),var(--pane-top-room,0px))]");
    expect(sheet.className).not.toMatch(/(^|\s)pt-\[var\(--sheet-pad-top\)\]/);
  });
});
