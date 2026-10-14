import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Provider, createStore, useAtomValue } from "jotai";
import React from "react";
import { atom_fileContent, atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_boardViewports } from "@/app/atoms/board-atoms";
import { serializeBoard, type BoardElement } from "@/app/utils/board/board-format";
import { flushAllBoardWrites } from "@/app/utils/board/board-flush";
import BoardView from "./BoardView";

const updateSpy = vi.fn();
// Captured in an effect (not during render) to satisfy react-hooks/globals.
const PROPS: { current: any } = { current: null };
const THEME: { current: "light" | "dark" } = { current: "light" };

vi.mock("@excalidraw/excalidraw", () => {
  const Excalidraw = (p: any) => {
    React.useEffect(() => {
      PROPS.current = p;
      p.excalidrawAPI?.({ updateScene: updateSpy });
    });
    return <div data-testid="excalidraw">{p.children}</div>;
  };
  const MainMenu: any = ({ children }: any) => <div>{children}</div>;
  MainMenu.DefaultItems = { ClearCanvas: () => null, ChangeCanvasBackground: () => null };
  return {
    Excalidraw,
    MainMenu,
    hashElementsVersion: (els: any[]) => els.map((e) => `${e.id}:${e.versionNonce}`).join(),
  };
});
vi.mock("@excalidraw/excalidraw/index.css", () => ({}));
vi.mock("./excalidraw-asset-path", () => ({}));
vi.mock("./BoardView.css", () => ({}));
vi.mock("@/app/hooks/use-resolved-theme", () => ({ useResolvedTheme: () => THEME.current }));

const PATH = "Sketch.board.md";
const doc = { head: "---\nhermes: board\nboard-version: 1\n---\n\nSome prose.\n\n", tail: "\n" };
const el = (id: string, versionNonce: number, extra: Record<string, unknown> = {}): BoardElement =>
  ({ id, type: "rectangle", x: 1, y: 2, width: 3, height: 4, versionNonce, ...extra }) as BoardElement;
const md = (elements: BoardElement[], appState = {}) => serializeBoard(doc, { appState, elements, files: {} });
// What the component writes: the allow-listed appState picked from baseAppState.
const WRITTEN = { viewBackgroundColor: "#ffffff" };
const INITIAL = md([el("a", 1)]);
const baseAppState = { viewBackgroundColor: "#ffffff", scrollX: 0, scrollY: 0, zoom: { value: 1 } };

function Harness({ store, onEdit }: { store: ReturnType<typeof createStore>; onEdit: () => void }) {
  const content = useAtomValue(atom_fileContent(PATH), { store });
  return <BoardView path={PATH} content={content} onEditAsMarkdown={onEdit} />;
}

function setup(content = INITIAL, store = createStore()) {
  store.set(atom_openFiles, { [PATH]: { fileName: PATH, content, lastSavedContent: content, activeFilePath: PATH } as any });
  const onEdit = vi.fn();
  const view = render(
    <Provider store={store}>
      <Harness store={store} onEdit={onEdit} />
    </Provider>,
  );
  const state = () => store.get(atom_openFiles)[PATH];
  return { store, onEdit, view, state };
}

describe("BoardView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    PROPS.current = null;
    THEME.current = "light";
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("doesn't write on the first onChange (the baseline)", () => {
    const { state } = setup();
    act(() => PROPS.current.onChange([el("a", 1)], baseAppState));
    act(() => vi.advanceTimersByTime(1000));
    expect(state().content).toBe(INITIAL);
    expect(state().content).toBe(state().lastSavedContent);
  });

  it("writes serialized Markdown 500 ms after an element change, keeping the prose", () => {
    const { state } = setup();
    act(() => PROPS.current.onChange([el("a", 1)], baseAppState));
    act(() => PROPS.current.onChange([el("a", 1), el("b", 2)], baseAppState));
    act(() => vi.advanceTimersByTime(499));
    expect(state().content).toBe(INITIAL);
    act(() => vi.advanceTimersByTime(2));
    expect(state().content).toBe(md([el("a", 1), el("b", 2)], WRITTEN));
    expect(state().content).toContain("Some prose.");
    expect(state().content).not.toBe(state().lastSavedContent);
  });

  it("ignores selection, scroll and zoom changes", () => {
    const { state } = setup();
    act(() => PROPS.current.onChange([el("a", 1)], baseAppState));
    act(() => PROPS.current.onChange([el("a", 1)], { ...baseAppState, scrollX: 40, zoom: { value: 2 }, selectedElementIds: { a: true } }));
    act(() => vi.advanceTimersByTime(1000));
    expect(state().content).toBe(INITIAL);
  });

  it("writes when the background color changes", () => {
    const { state } = setup();
    act(() => PROPS.current.onChange([el("a", 1)], baseAppState));
    act(() => PROPS.current.onChange([el("a", 1)], { ...baseAppState, viewBackgroundColor: "#ffeecc" }));
    act(() => vi.advanceTimersByTime(600));
    expect(state().content).toContain('"viewBackgroundColor":"#ffeecc"');
  });

  it("flushes a pending change on unmount", () => {
    const { state, view } = setup();
    act(() => PROPS.current.onChange([el("a", 1)], baseAppState));
    act(() => PROPS.current.onChange([el("a", 1), el("b", 2)], baseAppState));
    view.unmount();
    expect(state().content).toBe(md([el("a", 1), el("b", 2)], WRITTEN));
  });

  it("flushAllBoardWrites writes synchronously", () => {
    const { state } = setup();
    act(() => PROPS.current.onChange([el("a", 1)], baseAppState));
    act(() => PROPS.current.onChange([el("a", 1), el("c", 3)], baseAppState));
    expect(state().content).toBe(INITIAL);
    flushAllBoardWrites();
    expect(state().content).toBe(md([el("a", 1), el("c", 3)], WRITTEN));
  });

  it("drops a pending change when the text changes outside, and updates the scene", () => {
    const { store, state } = setup();
    act(() => PROPS.current.onChange([el("a", 1)], baseAppState));
    act(() => PROPS.current.onChange([el("a", 1), el("b", 2)], baseAppState));
    const external = md([el("z", 9)]);
    act(() => store.set(atom_fileContent(PATH), external));
    act(() => vi.advanceTimersByTime(1000));
    expect(state().content).toBe(external);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.mock.calls[0][0].elements.map((e: BoardElement) => e.id)).toEqual(["z"]);
  });

  it("shows the conflict message and never writes", () => {
    const bad = "```hermes-board\n<<<<<<< HEAD\n{}\n=======\n{}\n>>>>>>> x\n```\n";
    const { onEdit, state } = setup(bad);
    expect(screen.getByText("This board has unresolved merge conflicts")).toBeInTheDocument();
    expect(screen.queryByTestId("excalidraw")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit as Markdown" }));
    expect(onEdit).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(state().content).toBe(bad);
  });

  it("shows the unreadable message for invalid JSON", () => {
    setup("```hermes-board\n{nope\n```\n");
    expect(screen.getByText("This board couldn't be read")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit as Markdown" })).toBeInTheDocument();
  });

  it("renders the board again once outside text is valid", () => {
    const { store } = setup("```hermes-board\n{nope\n```\n");
    act(() => store.set(atom_fileContent(PATH), INITIAL));
    expect(screen.getByTestId("excalidraw")).toBeInTheDocument();
    expect(PROPS.current.initialData.elements.map((e: BoardElement) => e.id)).toEqual(["a"]);
  });

  it("follows the resolved theme", () => {
    THEME.current = "dark";
    setup();
    expect(PROPS.current.theme).toBe("dark");
  });

  it("prevents a file drop on the canvas", () => {
    setup();
    const wrapper = screen.getByTestId("excalidraw").closest(".hermes-board")!;
    const notPrevented = fireEvent.drop(wrapper, { dataTransfer: { types: ["Files"], files: [] } });
    expect(notPrevented).toBe(false);
  });

  it("blocks pasted images and files, and hides the image tool", () => {
    setup();
    const clipboardData = { files: [], items: [{ kind: "file", type: "image/png" }] };
    expect(PROPS.current.onPaste({}, { clipboardData })).toBe(false);
    expect(PROPS.current.onPaste({}, { clipboardData: { files: [], items: [{ kind: "string", type: "text/plain" }] } })).toBe(true);
    expect(PROPS.current.UIOptions.tools.image).toBe(false);
    expect(PROPS.current.UIOptions.canvasActions.export).toBe(false);
    expect(PROPS.current.isCollaborating).toBe(false);
  });

  it("scrolls to the content when there's no saved viewport, and restores one when there is", () => {
    setup();
    expect(PROPS.current.initialData.scrollToContent).toBe(true);
    cleanup();
    const store = createStore();
    store.set(atom_boardViewports, { [PATH]: { scrollX: 5, scrollY: 6, zoom: 2 } });
    setup(INITIAL, store);
    expect(PROPS.current.initialData.scrollToContent).toBe(false);
    expect(PROPS.current.initialData.appState).toMatchObject({ scrollX: 5, scrollY: 6, zoom: { value: 2 } });
  });
});
