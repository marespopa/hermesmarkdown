import { act, renderHook } from "@testing-library/react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import { useCodeMirrorCodeLanguagePicker } from "./use-codemirror-code-language-picker";

function makeView(text = "```\n\n```") {
  return new EditorView({ state: EditorState.create({ doc: text }) });
}

describe("useCodeMirrorCodeLanguagePicker", () => {
  it("activates at the language slot and tracks typed text", () => {
    const view = makeView();
    const viewRef = { current: view };
    const containerRef = { current: null };
    const { result } = renderHook(() => useCodeMirrorCodeLanguagePicker({ viewRef, containerRef }));

    act(() => result.current.activate(view, 3));
    expect(result.current.languagePickerInfo).toBe(true);
    expect(result.current.query).toBe("");

    act(() => result.current.changeQuery("typescript"));
    act(() => result.current.onCursorActivity(view));
    expect(result.current.query).toBe("typescript");
    expect(view.state.doc.toString()).toBe("```typescript\n\n```");
    view.destroy();
  });

  it("deactivates when the info string contains a space or the cursor moves away", () => {
    const view = makeView();
    const viewRef = { current: view };
    const containerRef = { current: null };
    const { result } = renderHook(() => useCodeMirrorCodeLanguagePicker({ viewRef, containerRef }));

    act(() => result.current.activate(view, 3));
    act(() => result.current.changeQuery("type script"));
    act(() => result.current.onCursorActivity(view));
    expect(result.current.languagePickerInfo).toBe(false);

    view.destroy();
  });

  it("commits a language and moves the cursor into the fence body", () => {
    const view = makeView();
    const viewRef = { current: view };
    const containerRef = { current: null };
    const { result } = renderHook(() => useCodeMirrorCodeLanguagePicker({ viewRef, containerRef }));

    act(() => result.current.activate(view, 3));
    act(() => result.current.selectLanguage("javascript"));
    expect(view.state.doc.toString()).toBe("```javascript\n\n```");
    expect(view.state.selection.main.head).toBe("```javascript\n".length);
    expect(result.current.languagePickerInfo).toBe(false);
    view.destroy();
  });
});