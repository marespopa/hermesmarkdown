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
  private languageCompartment = new Compartment();
  private syncingFromCM = false;
  private destroyed = false;
  private currentLanguage: string;
  private diagramEl: HTMLElement | null = null;
  private diagramId = "";
  private diagramInside = false;
  private themeObserver: MutationObserver | null = null;

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
          cmKeymap.of([...defaultKeymap, ...historyKeymap]),
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

  // Rendered diagram replaces the CM6 surface when the selection isn't
  // inside this node ("click away to render"); clicking the diagram moves
  // the selection back in and reveals the raw ```mermaid source.
  private setupMermaid() {
    const diagram = document.createElement("div");
    diagram.contentEditable = "false";
    diagram.className = "mermaid-diagram flex justify-center overflow-x-auto px-3 py-3 cursor-text";
    diagram.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const pos = this.getPos();
      if (pos == null) return;
      const tr = this.view.state.tr.setSelection(TextSelection.near(this.view.state.doc.resolve(pos + 1)));
      this.view.dispatch(tr);
      this.view.focus();
    });
    this.dom.insertBefore(diagram, this.dom.firstChild);
    this.diagramEl = diagram;

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
    this.themeObserver?.disconnect();
    this.themeObserver = null;
  }

  private applyMermaidVisibility() {
    if (!this.diagramEl) return;
    this.diagramEl.style.display = this.diagramInside ? "none" : "";
    this.cm.dom.style.display = this.diagramInside ? "" : "none";
  }

  private renderMermaid() {
    if (!this.diagramEl) return;
    const source = this.cm.state.doc.toString();
    if (!source.trim()) {
      this.diagramEl.replaceChildren();
      return;
    }
    const isDark = document.documentElement.classList.contains("dark");
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
