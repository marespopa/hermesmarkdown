// Table actions for the inline table editor, kept off the cells so they
// never sit on top of text being typed:
//   - right-click (or long-press) a cell opens one menu with row, column
//     and table actions, anchored at the pointer;
//   - while a table is being edited, spreadsheet-style column letters and
//     row numbers appear in gutters around it; clicking one opens the same
//     menu for that column/row (the visible affordance for touch).

import { colIndexToLetter } from "../utils/formula-engine";

export type TableMenuEntry =
  | {
      label: string;
      hint?: string;
      danger?: boolean;
      disabled?: boolean;
      // Two-click confirmation for destructive items.
      confirmLabel?: string;
      run: () => void;
    }
  | { heading: string }
  | { separator: true };

let openMenu: { el: HTMLElement; close: () => void } | null = null;

export function closeTableMenu() {
  openMenu?.close();
}

export function isTableMenuOpen() {
  return openMenu !== null;
}

type MenuAnchor = { element: HTMLElement } | { x: number; y: number; doc: Document };

export function showTableMenu(anchor: MenuAnchor, entries: TableMenuEntry[], label: string) {
  closeTableMenu();
  const doc = "element" in anchor ? anchor.element.ownerDocument : anchor.doc;
  const menu = doc.createElement("div");
  menu.className = "cm-table-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", label);

  for (const entry of entries) {
    if ("separator" in entry) {
      const sep = doc.createElement("div");
      sep.className = "cm-table-menu-sep";
      menu.appendChild(sep);
      continue;
    }
    if ("heading" in entry) {
      const heading = doc.createElement("div");
      heading.className = "cm-table-menu-heading";
      heading.textContent = entry.heading;
      menu.appendChild(heading);
      continue;
    }
    const button = doc.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.className = `cm-table-menu-item${entry.danger ? " is-danger" : ""}`;
    button.disabled = !!entry.disabled;
    const text = doc.createElement("span");
    text.textContent = entry.label;
    button.appendChild(text);
    if (entry.hint) {
      const hint = doc.createElement("kbd");
      hint.textContent = entry.hint;
      button.appendChild(hint);
    }
    // mousedown is swallowed so the cell being edited keeps focus.
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      if (entry.confirmLabel && !button.dataset.armed) {
        button.dataset.armed = "true";
        text.textContent = entry.confirmLabel;
        return;
      }
      closeTableMenu();
      entry.run();
    });
    menu.appendChild(button);
  }

  doc.body.appendChild(menu);
  const menuRect = menu.getBoundingClientRect();
  const viewportWidth = doc.documentElement.clientWidth;
  const viewportHeight = doc.documentElement.clientHeight;
  let top: number;
  let left: number;
  if ("element" in anchor) {
    const rect = anchor.element.getBoundingClientRect();
    top = rect.bottom + 6;
    if (top + menuRect.height > viewportHeight - 8) top = rect.top - menuRect.height - 6;
    left = rect.left;
  } else {
    top = anchor.y + 2;
    if (top + menuRect.height > viewportHeight - 8) top = anchor.y - menuRect.height - 2;
    left = anchor.x + 2;
  }
  menu.style.top = `${Math.max(8, top)}px`;
  menu.style.left = `${Math.max(8, Math.min(left, viewportWidth - menuRect.width - 8))}px`;

  const trigger = "element" in anchor ? anchor.element : null;
  const onPointerDown = (event: Event) => {
    if (!menu.contains(event.target as Node) && event.target !== trigger) closeTableMenu();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeTableMenu();
    }
  };
  const close = () => {
    menu.remove();
    doc.removeEventListener("mousedown", onPointerDown, true);
    doc.removeEventListener("keydown", onKeyDown, true);
    doc.removeEventListener("scroll", close, true);
    trigger?.setAttribute("aria-expanded", "false");
    if (openMenu?.el === menu) openMenu = null;
  };
  doc.addEventListener("mousedown", onPointerDown, true);
  doc.addEventListener("keydown", onKeyDown, true);
  doc.addEventListener("scroll", close, true);
  trigger?.setAttribute("aria-expanded", "true");
  openMenu = { el: menu, close };
}

export interface TableRulers {
  // Shows the rulers around the table containing `cell` (highlighting its
  // row and column), or hides them when null.
  update(cell: HTMLElement | null): void;
}

// Spreadsheet-style row numbers and column letters, shown while a table is
// being edited. They match formula addressing (A1 = first header cell, the
// first data row is 2) and double as menu buttons: clicking a letter or a
// number focuses that column/row and opens the table menu for it. They live
// in gutters reserved around the table, never on top of a cell.
export function createTableRulers(
  scroll: HTMLElement,
  options: {
    menuFor: (cell: HTMLElement) => TableMenuEntry[];
    // The cell to act on for a clicked column letter / row number.
    cellFor: (row: number | null, col: number | null) => HTMLElement | null;
    focusCell: (cell: HTMLElement) => void;
  },
): TableRulers {
  const doc = scroll.ownerDocument;
  const layer = doc.createElement("div");
  layer.className = "cm-table-rulers";
  layer.hidden = true;
  layer.setAttribute("contenteditable", "false");
  scroll.appendChild(layer);

  const letters: HTMLButtonElement[] = [];
  const numbers: HTMLButtonElement[] = [];

  const makeLabel = (kind: "col" | "row") => {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = `cm-table-ruler cm-table-ruler-${kind}`;
    button.setAttribute("aria-haspopup", "menu");
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (button.getAttribute("aria-expanded") === "true") {
        closeTableMenu();
        return;
      }
      const index = Number(button.dataset.index);
      const cell = kind === "col" ? options.cellFor(null, index) : options.cellFor(index, null);
      if (!cell) return;
      options.focusCell(cell);
      showTableMenu({ element: button }, options.menuFor(cell), button.title);
    });
    layer.appendChild(button);
    return button;
  };

  const sync = (pool: HTMLButtonElement[], count: number, kind: "col" | "row") => {
    while (pool.length < count) pool.push(makeLabel(kind));
    pool.forEach((button, i) => {
      button.hidden = i >= count;
    });
  };

  return {
    update(cell) {
      const table = cell?.isConnected ? cell.closest("table") : null;
      if (!cell || !table) {
        layer.hidden = true;
        return;
      }
      layer.hidden = false;
      const base = scroll.getBoundingClientRect();
      const x = (rect: DOMRect) => rect.left - base.left + scroll.scrollLeft;
      const y = (rect: DOMRect) => rect.top - base.top + scroll.scrollTop;
      const activeCol = (cell as HTMLTableCellElement).cellIndex;
      const activeRow = (cell.parentElement as HTMLTableRowElement).rowIndex; // 0 = header

      const headerCells = [...(table.tHead?.rows[0]?.cells ?? [])];
      sync(letters, headerCells.length, "col");
      headerCells.forEach((headerCell, i) => {
        const rect = headerCell.getBoundingClientRect();
        const button = letters[i];
        const letter = colIndexToLetter(i);
        button.textContent = letter;
        button.dataset.index = String(i);
        button.title = `Column ${letter} options`;
        button.setAttribute("aria-label", `Column ${letter} options`);
        button.classList.toggle("is-active", i === activeCol);
        button.style.left = `${Math.round(x(rect))}px`;
        button.style.width = `${Math.round(rect.width)}px`;
      });

      const rows = [...table.rows];
      sync(numbers, rows.length, "row");
      rows.forEach((row, i) => {
        const rect = row.getBoundingClientRect();
        const button = numbers[i];
        const number = String(i + 1);
        button.textContent = number;
        button.dataset.index = String(i);
        button.title = `Row ${number} options`;
        button.setAttribute("aria-label", `Row ${number} options`);
        button.classList.toggle("is-active", i === activeRow);
        button.style.top = `${Math.round(y(rect))}px`;
        button.style.height = `${Math.round(rect.height)}px`;
      });
    },
  };
}
