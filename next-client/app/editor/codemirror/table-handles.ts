// Table actions for the inline table editor, kept off the cells so they
// never sit on top of text being typed:
//   - right-click (or long-press) a cell opens one menu with row, column
//     and table actions, anchored at the pointer;
//   - a single small tab in the strip *above* the table, over the active
//     column, opens the same menu (the visible affordance for touch). It
//     fades out while typing and returns on pointer movement.

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

export interface TableColumnTab {
  // Moves the tab over `cell`'s column (or hides it when null).
  update(cell: HTMLElement | null): void;
  // Fades the tab while the user types; pointer movement brings it back.
  setTyping(typing: boolean): void;
}

export function createColumnTab(
  scroll: HTMLElement,
  menuFor: (cell: HTMLElement) => TableMenuEntry[],
): TableColumnTab {
  const doc = scroll.ownerDocument;
  const tab = doc.createElement("button");
  tab.type = "button";
  tab.className = "cm-table-column-tab";
  tab.hidden = true;
  tab.title = "Table options";
  tab.setAttribute("aria-label", "Table options");
  tab.setAttribute("aria-haspopup", "menu");
  tab.setAttribute("contenteditable", "false");
  scroll.appendChild(tab);

  let current: HTMLElement | null = null;

  tab.addEventListener("mousedown", (event) => event.preventDefault());
  tab.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!current) return;
    if (tab.getAttribute("aria-expanded") === "true") {
      closeTableMenu();
      return;
    }
    showTableMenu({ element: tab }, menuFor(current), "Table options");
  });

  return {
    update(cell) {
      current = cell && cell.isConnected ? cell : null;
      const headerCell = current?.closest("table")?.tHead?.rows[0]?.cells[(current as HTMLTableCellElement).cellIndex];
      if (!current || !headerCell) {
        tab.hidden = true;
        return;
      }
      const base = scroll.getBoundingClientRect();
      const header = headerCell.getBoundingClientRect();
      tab.hidden = false;
      // Centred over the column, in the strip above the header row.
      const left = header.left - base.left + scroll.scrollLeft + header.width / 2 - tab.offsetWidth / 2;
      const top = header.top - base.top + scroll.scrollTop - tab.offsetHeight - 3;
      tab.style.left = `${Math.round(left)}px`;
      tab.style.top = `${Math.round(Math.max(0, top))}px`;
    },
    setTyping(typing) {
      tab.classList.toggle("is-typing", typing);
    },
  };
}
