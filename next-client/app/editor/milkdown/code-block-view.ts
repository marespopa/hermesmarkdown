import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import { Fragment } from "@milkdown/kit/prose/model";
import type { EditorView, NodeView } from "@milkdown/kit/prose/view";
import { TextSelection } from "@milkdown/kit/prose/state";
import { $view } from "@milkdown/kit/utils";
import { codeBlockSchema } from "@milkdown/kit/preset/commonmark";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView as CMView, keymap as cmKeymap, drawSelection } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands";
import { LanguageDescription, syntaxHighlighting, bracketMatching, indentOnInput } from "@codemirror/language";
import { languages as languageData } from "@codemirror/language-data";
import { baseTheme, codeBlockHighlightStyle } from "../codemirror/theme";
import { isSelectionInside } from "./node-view-utils";

// Mermaid ships a full parser/renderer — loaded once per module, not per
// diagram, and only client-side since it touches the DOM directly. Ported
// from the old read-only Preview.tsx's MermaidDiagram (now deleted; that
// surface no longer exists, this is the only mermaid renderer left).
let mermaidPromise: Promise<typeof import("mermaid")["default"]> | null = null;
function loadMermaid() {
  if (!mermaidPromise) mermaidPromise = import("mermaid").then((m) => m.default);
  return mermaidPromise;
}
let mermaidIdCounter = 0;

// Worker-backed mermaid renderer. Falls back to in-main rendering if workers unavailable.
let mermaidWorker: Worker | null = null;
function getMermaidWorker() {
  if (mermaidWorker) return mermaidWorker;
  try {
    // Module worker; bundlers that support `new URL(..., import.meta.url)` will create a separate chunk.
    mermaidWorker = new Worker(new URL("../workers/mermaid-worker.ts", import.meta.url), { type: "module" });
  } catch (err) {
    mermaidWorker = null;
  }
  return mermaidWorker;
}

// Fenced code blocks (any language, including ```mermaid) are all one
// schema node — codeBlockSchema — so this single NodeView handles both
// "code highlighting" and "mermaid diagram" duties, branching on
// node.attrs.language, rather than being two separate registrations.
//
// No contentDOM: this node opts out of ProseMirror-managed editable
// content entirely and instead owns a nested CodeMirror 6 EditorView,
// mounted directly into `dom`. CM6 provides the actual typing/highlight
// surface; ProseMirror only ever sees whole-node text replacements synced
// in from CM6's updateListener, guarded by `syncingFromCM` so the update()
// call those replacements trigger doesn't loop back into CM6.
class CodeBlockView implements NodeView {
  dom: HTMLElement;
  private node: ProseNode;
  private cm: CMView;
  private cmHost: HTMLElement;
  private languageCompartment = new Compartment();
  private syncingFromCM = false;
  private destroyed = false;
  private currentLanguage: string;
  private diagramEl: HTMLElement | null = null;
  private diagramId = "";
  private diagramInside = false;
  private themeObserver: MutationObserver | null = null;
  private mermaidToggle: HTMLElement | null = null;
  private mermaidToggleButtons: { diagram: HTMLButtonElement; code: HTMLButtonElement } | null = null;

  constructor(
    node: ProseNode,
    private view: EditorView,
    private getPos: () => number | undefined,
  ) {
    this.node = node;
    this.currentLanguage = node.attrs.language || "";

    const wrapper = document.createElement("div");
    wrapper.className =
      "code-block-view not-prose my-4 rounded-lg border border-edge overflow-hidden bg-paper-softgray/40 dark:bg-paper-dark-surface/40";
    this.dom = wrapper;

    const cmHost = document.createElement("div");
    cmHost.className = "px-3 py-2 font-mono text-ui-footnote";
    wrapper.appendChild(cmHost);
    this.cmHost = cmHost;

    this.cm = new CMView({
      parent: cmHost,
      state: EditorState.create({
        doc: node.textContent,
        extensions: [
          baseTheme,
          syntaxHighlighting(codeBlockHighlightStyle),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          cmKeymap.of([
            { key: "Shift-Enter", run: () => this.exitCodeBlock() },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          this.languageCompartment.of([]),
          CMView.lineWrapping,
          CMView.updateListener.of((update) => {
            if (update.docChanged && !this.syncingFromCM) this.syncToProseMirror(update.state.doc.toString());
          }),
        ],
      }),
    });

    if (this.currentLanguage === "mermaid") {
      this.diagramId = `mermaid-${Date.now()}-${mermaidIdCounter++}`;
      this.setupMermaid();
    }

    this.loadLanguage(this.currentLanguage);
  }

  // ProseMirror's own EXIT_BLOCK_SHIFT_ENTER plugin (plugins.ts) never sees
  // this key: CM6 owns its own contentEditable focus context inside cmHost,
  // and this NodeView's stopEvent() unconditionally returns true, which
  // makes ProseMirror's eventBelongsToView() treat every DOM event bubbling
  // out of this node as not belonging to it — so its handleKeyDown props
  // are never invoked for keys pressed while CM6 has focus. Bound directly
  // in CM6's own keymap instead, mirroring that plugin's behavior: always
  // insert a fresh empty paragraph right after this block and land the
  // cursor there, even if something already follows it.
  private exitCodeBlock() {
    const pos = this.getPos();
    if (pos == null) return false;
    const { state } = this.view;
    const afterPos = pos + this.node.nodeSize;
    const paragraphType = state.schema.nodes.paragraph;
    const tr = state.tr.insert(afterPos, paragraphType.createChecked());
    tr.setSelection(TextSelection.near(tr.doc.resolve(afterPos + 1)));
    this.view.dispatch(tr.scrollIntoView());
    this.view.focus();
    return true;
  }

  private syncToProseMirror(text: string) {
    const pos = this.getPos();
    if (pos == null) return;
    const { state } = this.view;
    const from = pos + 1;
    const to = pos + this.node.nodeSize - 1;
    const content = text ? state.schema.text(text) : Fragment.empty;
    this.syncingFromCM = true;
    this.view.dispatch(state.tr.replaceWith(from, to, content));
    this.syncingFromCM = false;
  }

  private async loadLanguage(lang: string) {
    if (!lang || lang === "mermaid") {
      this.cm.dispatch({ effects: this.languageCompartment.reconfigure([]) });
      return;
    }
    const desc = LanguageDescription.matchLanguageName(languageData, lang, true);
    if (!desc) {
      this.cm.dispatch({ effects: this.languageCompartment.reconfigure([]) });
      return;
    }
    try {
      const support = await desc.load();
      if (this.destroyed || this.currentLanguage !== lang) return;
      this.cm.dispatch({ effects: this.languageCompartment.reconfigure(support) });
    } catch {
      // Unrecognized/failed-to-load language — falls back to plain text,
      // never blocks editing.
    }
  }

  // Moves the selection in or out of this node, which is what actually
  // drives render-vs-edit (see update()'s isSelectionInside check). The
  // corner tab and the "click diagram to edit" gesture both funnel through
  // this — there's no separate forced-mode flag to keep in sync.
  private setMermaidMode(mode: "diagram" | "code") {
    const pos = this.getPos();
    if (pos == null) return;
    const { state } = this.view;
    const wantInside = mode === "code";

    if (wantInside) {
      this.view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos + 1))));
    } else {
      // Land strictly outside [pos, pos + nodeSize] so a later isSelectionInside
      // check agrees; at the doc's last node "after" would otherwise sit exactly
      // on the boundary.
      const afterPos = pos + this.node.nodeSize + 1;
      const beforePos = pos - 1;
      const target = afterPos <= state.doc.content.size ? afterPos : Math.max(beforePos, 0);
      this.view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(target))));
    }
    this.view.focus();

    // A transaction that only changes the selection doesn't necessarily make
    // ProseMirror re-invoke NodeView.update (prosemirror-view's updateStateInner
    // skips docView.update unless the doc/decorations actually changed) — so
    // relying on update()'s isSelectionInside check alone to flip visibility is
    // flaky: it only "happens" to work when some other selection-dependent
    // decoration elsewhere in the doc forces a full redraw. Set it directly
    // here instead, so the corner tab (and the "click diagram to edit" gesture,
    // both funnel through this) always takes effect immediately regardless of
    // whether ProseMirror's own redraw pass runs.
    if (wantInside !== this.diagramInside) {
      this.diagramInside = wantInside;
      this.applyMermaidVisibility();
      if (!wantInside) this.renderMermaid();
    }
  }

  // Rendered diagram replaces the CM6 surface when the selection isn't
  // inside this node ("click away to render"); clicking the diagram moves
  // the selection back in and reveals the raw ```mermaid source. The
  // always-visible corner tab offers the same two moves explicitly, since
  // "click the diagram to edit" isn't discoverable on its own.
  private openMermaidDialog() {
    const source = this.cm.state.doc.toString();
    const isDark = document.documentElement.classList.contains("dark");
    const evt = new CustomEvent("hermes:open-mermaid-dialog", {
      detail: { source, theme: isDark ? "dark" : "default" },
      bubbles: true,
    });
    document.dispatchEvent(evt);
  }

  private setupMermaid() {
    const diagram = document.createElement("div");
    diagram.contentEditable = "false";
    diagram.className = "mermaid-diagram flex justify-center overflow-x-auto px-3 py-3 cursor-text";
    diagram.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.openMermaidDialog();
    });
    this.dom.insertBefore(diagram, this.dom.firstChild);
    this.diagramEl = diagram;

    this.dom.style.position = "relative";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = "Open diagram";
    trigger.className =
      "absolute top-2 left-2 z-10 rounded-md border border-edge bg-paper-light/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-light shadow-sm transition hover:bg-paper-softgray dark:bg-paper-dark/95 dark:text-ink-dark dark:hover:bg-paper-dark-surface";
    trigger.setAttribute("aria-label", "Open Mermaid diagram in dialog");
    trigger.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openMermaidDialog();
    });
    this.dom.appendChild(trigger);

    const toggle = document.createElement("div");
    toggle.contentEditable = "false";
    toggle.className =
      "mermaid-toggle absolute top-2 right-2 z-10 flex items-center gap-0.5 p-0.5 bg-paper-light dark:bg-paper-dark border border-edge rounded-md shadow-sm select-none";
    const makeToggleBtn = (label: string, mode: "diagram" | "code") => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.className = "px-2 py-0.5 rounded text-ui-micro font-medium transition-colors";
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.setMermaidMode(mode);
      });
      return btn;
    };
    const diagramBtn = makeToggleBtn("Diagram", "diagram");
    const codeBtn = makeToggleBtn("Code", "code");
    toggle.append(diagramBtn, codeBtn);
    this.dom.appendChild(toggle);
    this.mermaidToggle = toggle;
    this.mermaidToggleButtons = { diagram: diagramBtn, code: codeBtn };

    const pos = this.getPos();
    this.diagramInside = pos != null && isSelectionInside(this.view, pos, this.node.nodeSize);
    this.applyMermaidVisibility();
    if (!this.diagramInside) this.renderMermaid();

    // Diagrams are rendered against the app's global light/dark class;
    // toggling it doesn't touch this node's text, so without this observer
    // an already-rendered diagram would keep stale colors until the next edit.
    this.themeObserver = new MutationObserver(() => this.renderMermaid());
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }

  private teardownMermaid() {
    this.diagramEl?.remove();
    this.diagramEl = null;
    this.mermaidToggle?.remove();
    this.mermaidToggle = null;
    this.mermaidToggleButtons = null;
    this.cmHost.style.display = "";
    this.themeObserver?.disconnect();
    this.themeObserver = null;
  }

  private applyMermaidVisibility() {
    if (!this.diagramEl) return;
    this.diagramEl.style.display = this.diagramInside ? "none" : "";
    // Hide the whole padded host, not just CM6's own root — otherwise its
    // px-3/py-2 padding stays laid out as an empty box under the diagram.
    this.cmHost.style.display = this.diagramInside ? "" : "none";

    if (this.mermaidToggleButtons) {
      const activeCls = ["bg-paper-softgray", "dark:bg-paper-dark-surface", "text-ink-light", "dark:text-ink-dark"];
      const inactiveCls = ["text-ink-muted", "dark:text-stone"];
      const { diagram, code } = this.mermaidToggleButtons;
      diagram.classList.remove(...activeCls, ...inactiveCls);
      code.classList.remove(...activeCls, ...inactiveCls);
      diagram.classList.add(...(this.diagramInside ? inactiveCls : activeCls));
      code.classList.add(...(this.diagramInside ? activeCls : inactiveCls));
    }
  }

  private renderMermaid() {
    if (!this.diagramEl) return;
    const source = this.cm.state.doc.toString();
    if (!source.trim()) {
      this.diagramEl.replaceChildren();
      return;
    }
    const isDark = document.documentElement.classList.contains("dark");

    // Try worker-first to keep heavy parsing off the main thread.
    const worker = getMermaidWorker();
    if (worker) {
      const id = `${this.diagramId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const onMessage = (e: MessageEvent) => {
        const data = e.data || {};
        if (data.id !== id) return;
        worker.removeEventListener("message", onMessage);
        if (!this.diagramEl) return;
        if (data.error) {
          this.diagramEl.replaceChildren();
          const p = document.createElement("p");
          p.className = "text-ui-footnote text-red-500 dark:text-red-400 py-2";
          p.textContent = data.error || "Failed to render diagram";
          this.diagramEl.appendChild(p);
        } else {
          this.diagramEl.innerHTML = data.svg || "";
        }
      };
      worker.addEventListener("message", onMessage);
      try {
        worker.postMessage({ id, source, theme: isDark ? "dark" : "default" });
        return;
      } catch (err) {
        worker.removeEventListener("message", onMessage);
        // fall through to in-main render
      }
    }

    // Fallback: render in main thread
    loadMermaid()
      .then((mermaid) => {
        mermaid.initialize({ startOnLoad: false, theme: isDark ? "dark" : "default", securityLevel: "strict" });
        return mermaid.render(this.diagramId, source);
      })
      .then(({ svg }) => {
        if (!this.diagramEl) return;
        this.diagramEl.innerHTML = svg;
      })
      .catch((err: unknown) => {
        if (!this.diagramEl) return;
        this.diagramEl.replaceChildren();
        const p = document.createElement("p");
        p.className = "text-ui-footnote text-red-500 dark:text-red-400 py-2";
        p.textContent = err instanceof Error ? err.message : "Failed to render diagram";
        this.diagramEl.appendChild(p);
      });
  }

  update(node: ProseNode): boolean {
    if (node.type !== this.node.type) return false;
    const languageChanged = node.attrs.language !== this.node.attrs.language;
    this.node = node;

    if (!this.syncingFromCM) {
      const newText = node.textContent;
      if (newText !== this.cm.state.doc.toString()) {
        this.cm.dispatch({ changes: { from: 0, to: this.cm.state.doc.length, insert: newText } });
      }
    }

    if (languageChanged) {
      this.currentLanguage = node.attrs.language || "";
      this.loadLanguage(this.currentLanguage);
      if (this.currentLanguage === "mermaid" && !this.diagramEl) {
        this.diagramId = `mermaid-${Date.now()}-${mermaidIdCounter++}`;
        this.setupMermaid();
      } else if (this.currentLanguage !== "mermaid" && this.diagramEl) {
        this.teardownMermaid();
      }
    }

    if (this.diagramEl) {
      const pos = this.getPos();
      const inside = pos != null && isSelectionInside(this.view, pos, node.nodeSize);
      if (inside !== this.diagramInside) {
        this.diagramInside = inside;
        this.applyMermaidVisibility();
        if (!inside) this.renderMermaid();
      }
    }

    return true;
  }

  stopEvent(): boolean {
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy() {
    this.destroyed = true;
    this.themeObserver?.disconnect();
    this.cm.destroy();
  }
}

export const codeBlockView = $view(
  codeBlockSchema.node,
  () => (node, view, getPos) => new CodeBlockView(node, view, getPos),
);
