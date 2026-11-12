import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import { atom_externalReviews, atom_recordExternalChange, atom_setExternalReview } from "./external-review-atoms";

describe("external review atoms", () => {
  it("keeps what a note said before an outside change", () => {
    const store = createStore();
    store.set(atom_recordExternalChange, { path: "a.md", before: "one\n", after: "two\n" });
    expect(store.get(atom_externalReviews)["a.md"].changes).toHaveLength(1);
  });

  it("records nothing when the text is the same", () => {
    const store = createStore();
    store.set(atom_recordExternalChange, { path: "a.md", before: "one\n", after: "one\n" });
    expect(store.get(atom_externalReviews)).toEqual({});
  });

  it("never keeps a private note's earlier text", () => {
    const store = createStore();
    store.set(atom_recordExternalChange, { path: "p.md", before: "---\nprivate: true\n---\nold\n", after: "---\nprivate: true\n---\nnew\n" });
    expect(store.get(atom_externalReviews)).toEqual({});
  });

  it("drops an earlier review when a note turns private", () => {
    const store = createStore();
    store.set(atom_recordExternalChange, { path: "a.md", before: "old\n", after: "new\n" });
    store.set(atom_recordExternalChange, { path: "a.md", before: "new\n", after: "---\nprivate: true\n---\nnew\n" });
    expect(store.get(atom_externalReviews)).toEqual({});
  });

  it("joins back-to-back outside changes and ends a review on request", () => {
    const store = createStore();
    store.set(atom_recordExternalChange, { path: "a.md", before: "one\n", after: "two\n" });
    store.set(atom_recordExternalChange, { path: "a.md", before: "two\n", after: "three\n" });
    expect(store.get(atom_externalReviews)["a.md"].before).toBe("one\n");
    store.set(atom_setExternalReview, { path: "a.md", review: null });
    expect(store.get(atom_externalReviews)).toEqual({});
  });
});
