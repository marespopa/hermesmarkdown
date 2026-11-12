import { fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { ReactNode } from "react";
import type { EditorView } from "@codemirror/view";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { atom_externalReviews } from "@/app/atoms/external-review-atoms";
import { buildExternalReview } from "@/app/editor/utils/external-review";
import ExternalChangeReview from "./ExternalChangeReview";

const BEFORE = "# Plan\n\nOld step\n\n## Notes\nkeep\n";
const AFTER = "# Plan\n\nNew step\n\n## Notes\nkeep\nextra\n";

function setup(text = AFTER) {
  const store = createStore();
  store.set(atom_externalReviews, { "plan.md": buildExternalReview("plan.md", BEFORE, AFTER)! });
  const view = { dispatch: vi.fn(), focus: vi.fn() };
  const Wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const utils = render(<ExternalChangeReview view={view as unknown as EditorView} filePath="plan.md" text={text} />, { wrapper: Wrapper });
  return { store, view, ...utils };
}

const open = () => fireEvent.click(screen.getByRole("button", { name: /Changed outside the editor/ }));

describe("ExternalChangeReview", () => {
  it("shows nothing for a note with no outside changes", () => {
    const { container } = render(
      <Provider store={createStore()}>
        <ExternalChangeReview view={null} filePath="plan.md" text={AFTER} />
      </Provider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("offers a quiet pill that opens a card per change under its heading", () => {
    setup();
    expect(screen.getByRole("button", { name: "Changed outside the editor · 2 changes" })).toBeInTheDocument();
    open();
    expect(screen.getByRole("button", { name: "Under Plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Under Notes" })).toBeInTheDocument();
    expect(screen.getByLabelText("Removed")).toHaveTextContent("Old step");
    expect(screen.getAllByLabelText("Added")[0]).toHaveTextContent("New step");
  });

  it("Undo puts the old text back as an edit and closes that card at once", () => {
    const { view, store } = setup();
    open();
    fireEvent.click(screen.getAllByRole("button", { name: "Undo" })[0]);
    expect(view.dispatch).toHaveBeenCalledWith(expect.objectContaining({
      changes: [{ from: 8, to: 17, insert: "Old step\n" }],
      userEvent: "input.external-undo",
    }));
    expect(store.get(atom_externalReviews)["plan.md"].changes.map((change) => change.id)).toEqual(["hunk-2"]);
  });

  it("Keep closes a card without touching the note", () => {
    const { view, store } = setup();
    open();
    fireEvent.click(screen.getAllByRole("button", { name: "Keep" })[0]);
    expect(view.dispatch).not.toHaveBeenCalled();
    expect(store.get(atom_externalReviews)["plan.md"].changes).toHaveLength(1);
  });

  it("Keep all ends the review; Undo all restores every change in one edit", () => {
    const first = setup();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Keep all" }));
    expect(first.store.get(atom_externalReviews)).toEqual({});
    first.unmount();

    const second = setup();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Undo all" }));
    expect(second.view.dispatch).toHaveBeenCalledTimes(1);
    const { changes } = second.view.dispatch.mock.calls[0][0];
    expect(changes).toEqual([
      { from: 8, to: 17, insert: "Old step\n" },
      { from: 32, to: 38, insert: "" },
    ]);
    expect(second.store.get(atom_externalReviews)).toEqual({});
  });

  it("drops a review whose changes the note's own edits have overwritten", () => {
    const { store } = setup("something else entirely\n");
    expect(store.get(atom_externalReviews)).toEqual({});
  });

  it("jumps to a change from its heading", () => {
    const { view } = setup();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Under Notes" }));
    expect(view.dispatch).toHaveBeenCalledWith(expect.objectContaining({ selection: { anchor: 32 } }));
    expect(view.focus).toHaveBeenCalled();
  });
});
