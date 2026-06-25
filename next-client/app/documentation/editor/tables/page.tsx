"use client";

import { DocPageLayout, DocKeyValueTable, DocCode, DocCallout } from "@/app/documentation/components/DocPageLayout";

export default function TablesPage() {
  return (
    <DocPageLayout
      cluster="Editor"
      clusterHref="/documentation"
      title="Tables"
      summary="Click inside a pipe table for a floating toolbar, or open the dialog for spreadsheet-style editing with live formulas."
      related={[
        { href: "/documentation/mobile/table-editor-dialog", label: "Table editor on mobile" },
        { href: "/documentation/editor/command-palette", label: "Command Palette" },
        { href: "/documentation/get-started/keyboard-shortcuts", label: "Keyboard shortcuts" },
      ]}
    >
      <div>
        <h2>Insert a table</h2>
        <p>
          Type <code>/table</code> in the slash menu, or the <code>{"{table}"}</code> shortcode.
          Both drop a 3×2 starter table with the cursor in the first cell.
        </p>
      </div>

      <div>
        <h2>Inline toolbar</h2>
        <p>Click inside any table to get a floating toolbar over it.</p>
        <DocKeyValueTable
          rows={[
            { label: "Advanced edit", value: "Open the dialog" },
            { label: "Delete table", value: "× in toolbar" },
            { label: "CSV export", value: "CSV in toolbar" },
          ]}
        />
      </div>

      <div>
        <h2>The dialog</h2>
        <p>
          A spreadsheet-style grid: A1-style column letters and row numbers stay visible while you
          scroll, the active cell gets a green border, and rows/columns are added or removed from
          a toolbar — never inline, so you can't delete one by accident while scrolling.
        </p>
        [screenshot — table dialog grid]
        <DocKeyValueTable
          rows={[
            { label: "Cell navigation", value: "Tab / Shift+Tab / Arrows" },
            { label: "Select a cell", value: "Click" },
            { label: "Edit a cell", value: "Double-click or Enter" },
            { label: "Select a range", value: "Shift+Click / Shift+Arrows" },
            { label: "New row at end", value: "Enter on last row" },
          ]}
        />
      </div>

      <div>
        <h2>Sorting and alignment</h2>
        <p>
          Smart sorting recognizes dates, currency, and plain numbers regardless of column
          alignment. Output stays clean, auto-padded Markdown that respects left, center, or right
          alignment markers.
        </p>
      </div>

      <div>
        <h2>Formula engine</h2>
        <p>
          Any cell starting with <code>=</code> is a live formula, using A1 references —{" "}
          <code>B2</code>, <code>B2:D2</code> — the same as a spreadsheet. The computed value
          renders live in both the editor and the dialog; the formula itself is what's saved to
          the file.
        </p>
        <DocCode>{`| Item | Amount             |
| ---- | ------------------- |
| Rent | $2,000              |
| Food | $400                |
|      | =SUM(B2:B3) → $2,400 |`}</DocCode>
        <p>
          Referenced cells can hold <code>2000</code>, <code>$2,000</code>, or{" "}
          <code>2,000 RON</code> — any placement, with or without a space — and still resolve as a
          number. The result formats back as that same currency automatically; summing a column of
          RON values produces a RON total with no currency setting required.
        </p>
        <p>
          In the dialog, typing <code>=</code> into a cell switches into point mode: click another
          cell to insert its reference, Shift+click for a range, or a column letter for the whole
          column — without losing your place in the formula.
        </p>
        <DocKeyValueTable
          rows={[
            { label: "calc(100+50)=", value: "150" },
            { label: "Insert =SUM(...) row", value: "Σ in dialog toolbar" },
          ]}
        />
        <DocCallout type="tip">
          Functions: SUM · AVERAGE · MIN · MAX · COUNT · COUNTA · ABS · ROUND · IF · AND · OR · NOT
          · CONCAT.
        </DocCallout>
      </div>
    </DocPageLayout>
  );
}
