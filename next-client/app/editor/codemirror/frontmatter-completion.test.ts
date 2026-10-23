import { describe, expect, it } from "vitest";
import { CompletionContext, type Completion, type CompletionResult } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createFrontmatterSource, type FrontmatterCompletionCallbacks } from "./frontmatter-completion";

const vocabulary = {
  keys: ["title", "description", "tags", "aliases", "status", "created", "priority"],
  tags: ["work", "writing", "ideas"],
  values: { status: ["draft", "review", "done"] },
};

function source(extra: FrontmatterCompletionCallbacks = {}) {
  return createFrontmatterSource({ current: { frontmatterVocabulary: () => vocabulary, ...extra } });
}

// `|` marks the caret.
async function complete(text: string, explicit = false, callbacks?: FrontmatterCompletionCallbacks, view?: EditorView) {
  const pos = text.indexOf("|");
  const state = view?.state ?? EditorState.create({ doc: text.replace("|", "") });
  return (await source(callbacks)(new CompletionContext(state, pos, explicit, view))) as CompletionResult | null;
}

const labels = (result: CompletionResult | null) => result?.options.map((option) => option.label) ?? [];

describe("frontmatter completion: keys", () => {
  it("offers keys the block doesn't have yet", async () => {
    const result = await complete("---\ntitle: Plan\nst|\n---\nBody");
    expect(labels(result)).toEqual(["description", "tags", "aliases", "status", "created", "priority"]);
    expect(result?.from).toBe(16);
  });

  it("stays quiet outside the frontmatter and in the middle of a line", async () => {
    expect(await complete("---\ntitle: Plan\n---\nst|")).toBeNull();
    expect(await complete("Just st|")).toBeNull();
    expect(await complete("---\nst|atus: draft\n---\n")).toBeNull();
  });

  it("inserts `tags: []` with the caret inside, for the tag menu", async () => {
    const view = new EditorView({ state: EditorState.create({ doc: "---\nta\n---\n" }) });
    const result = (await complete("---\nta|\n---\n", false, undefined, view))!;
    const tags = result.options.find((option) => option.label === "tags")!;
    (tags.apply as (v: EditorView, c: Completion, f: number, t: number) => void)(view, tags, result.from, 6);
    expect(view.state.doc.toString()).toBe("---\ntags: []\n---\n");
    expect(view.state.selection.main.head).toBe(11);
    view.destroy();
  });
});

describe("frontmatter completion: tags", () => {
  it("offers vault tags the list doesn't have, as you type one", async () => {
    const result = await complete("---\ntags: [work, wr|]\n---\n");
    expect(labels(result)).toEqual(["writing", "ideas"]);
    expect(result?.from).toBe(17);
  });

  it("works for a `- item` under tags", async () => {
    expect(labels(await complete("---\ntags:\n  - work\n  - i|\n---\n"))).toEqual(["writing", "ideas"]);
  });

  it("waits for a letter unless asked", async () => {
    expect(await complete("---\ntags: [|]\n---\n")).toBeNull();
    expect(labels(await complete("---\ntags: [|]\n---\n", true))).toEqual(["work", "writing", "ideas"]);
  });
});

describe("frontmatter completion: values", () => {
  it("offers the values a key repeats in the vault", async () => {
    expect(labels(await complete("---\nstatus: d|\n---\n"))).toEqual(["draft", "review", "done"]);
    expect(await complete("---\nstatus: |\n---\n")).toBeNull();
    expect(await complete("---\ncreated: 2|\n---\n")).toBeNull();
  });

  it("offers nothing for free text", async () => {
    expect(await complete("---\ntitle: |\n---\n", true)).toBeNull();
    expect(await complete("---\ndescription: Pl|\n---\n")).toBeNull();
  });
});
