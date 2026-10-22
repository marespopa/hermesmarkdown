import { useEffect, useRef, type RefObject } from "react";
import { EditorView } from "@codemirror/view";
import { anchorScrollTop, ratioScrollTop } from "../utils/scroll-sync";
import { PANE_TOP_ROOM_PX } from "../components/pane-header-classes";

interface ScrollLockOptions {
  enabled: boolean;
  /** The note in front of each pane: the same note syncs by document line. */
  paths: [string | undefined, string | undefined];
  /** Which pane (0 = first) is active; the one the other aligns to on enabling. */
  activeIndex: 0 | 1;
}

const CANVAS = ".editor-canvas";

function canvasOf(wrapper: HTMLElement | null): HTMLElement | null {
  return wrapper?.querySelector<HTMLElement>(CANVAS) ?? null;
}

function viewOf(canvas: HTMLElement): EditorView | null {
  const dom = canvas.querySelector<HTMLElement>(".cm-editor");
  return dom ? EditorView.findFromDOM(dom) : null;
}

// Keeps two panes scrolled together. Scroll doesn't bubble, so the listeners
// sit on the panes' wrappers in the capture phase, and only a text pane's
// vertical scroller (`.editor-canvas`) counts; boards, the private veil and
// empty panes have none, which pauses the lock. Each sync is coalesced to
// one per animation frame, and a scroll the lock itself caused is recognised
// by the value it left behind and not echoed back.
export function useScrollLock(
  refA: RefObject<HTMLElement | null>,
  refB: RefObject<HTMLElement | null>,
  { enabled, paths, activeIndex }: ScrollLockOptions,
) {
  const sameNote = !!paths[0] && paths[0] === paths[1];
  const sameNoteRef = useRef(sameNote);
  sameNoteRef.current = sameNote;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    if (!enabled) return;
    const wrappers = [refA.current, refB.current];
    if (!wrappers[0] || !wrappers[1]) return;
    const expected = new WeakMap<HTMLElement, number>();
    const pending = [false, false];

    const sync = (from: 0 | 1) => {
      const src = canvasOf(wrappers[from]);
      const dst = canvasOf(wrappers[1 - from]);
      if (!src || !dst) return;
      let next: number;
      if (sameNoteRef.current) {
        const srcView = viewOf(src);
        const dstView = viewOf(dst);
        if (!srcView || !dstView) return;
        next = anchorScrollTop({
          srcView,
          srcTop: src.getBoundingClientRect().top + PANE_TOP_ROOM_PX,
          dstView,
          dstTop: dst.getBoundingClientRect().top + PANE_TOP_ROOM_PX,
          dstScrollTop: dst.scrollTop,
        });
      } else {
        next = ratioScrollTop(src, dst);
      }
      if (!Number.isFinite(next)) return;
      const before = dst.scrollTop;
      if (Math.abs(before - next) < 1) return;
      dst.scrollTop = next;
      // Read back: the browser clamps to the scrollable range.
      if (dst.scrollTop !== before) expected.set(dst, dst.scrollTop);
    };

    const schedule = (from: 0 | 1) => {
      if (pending[from]) return;
      pending[from] = true;
      requestAnimationFrame(() => {
        pending[from] = false;
        sync(from);
      });
    };

    const handlers = wrappers.map((wrapper, index) => {
      const handler = (event: Event) => {
        const el = event.target;
        if (!(el instanceof HTMLElement) || !el.matches(CANVAS)) return;
        const echo = expected.get(el);
        if (echo !== undefined && Math.abs(el.scrollTop - echo) <= 1) {
          expected.delete(el);
          return;
        }
        expected.delete(el);
        schedule(index as 0 | 1);
      };
      wrapper!.addEventListener("scroll", handler, true);
      return handler;
    });

    // Turning the lock on aligns the other pane to the active one once.
    schedule(activeIndexRef.current);

    return () => {
      wrappers.forEach((wrapper, i) => wrapper!.removeEventListener("scroll", handlers[i], true));
    };
  }, [enabled, refA, refB]);
}
