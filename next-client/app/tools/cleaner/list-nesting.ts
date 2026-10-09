// Re-nests list items by their visual indentation: any deeper indent than
// the item above is a child, and each child is placed at its parent's
// content column (2 spaces under `- `, 3 under `1. `, 4 under `10. `), which
// is what CommonMark needs to keep the nesting. Continuation lines and code
// inside an item move with it.

interface Item {
  // Indent and content column in the source…
  orig: number;
  origContent: number;
  // …and in the output.
  content: number;
}

export class ListNesting {
  private stack: Item[] = [];

  get active() {
    return this.stack.length > 0;
  }

  // The source indent of the outermost item, or null outside a list.
  get baseIndent(): number | null {
    return this.stack[0]?.orig ?? null;
  }

  clear() {
    this.stack = [];
  }

  // Places an item with source indent `orig` and source content column
  // `origContent`; returns its output indent. `marker` is the output marker.
  place(orig: number, origContent: number, marker: string): number {
    while (this.stack.length && this.stack[this.stack.length - 1].orig > orig) this.stack.pop();
    if (this.stack.length && this.stack[this.stack.length - 1].orig === orig) this.stack.pop();
    const parent = this.stack[this.stack.length - 1];
    const indent = parent ? parent.content : 0;
    this.stack.push({ orig, origContent, content: indent + marker.length + 1 });
    return indent;
  }

  // The output indent for a non-item line indented `orig` columns inside the
  // list: under the deepest item it is indented past, keeping any indent
  // beyond that item's content column (code inside an item).
  continuation(orig: number): number {
    for (let k = this.stack.length - 1; k >= 0; k--) {
      const item = this.stack[k];
      if (item.orig < orig) return Math.max(item.content, item.content + orig - item.origContent);
    }
    return orig;
  }
}
