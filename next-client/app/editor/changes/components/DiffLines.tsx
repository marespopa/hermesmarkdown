"use client";

import Button from "@/app/components/Button";
import { ADD_ROW, ADD_SIGN, CODE_FONT, DEL_ROW, DEL_SIGN } from "../diff-classes";
import type { DiffRow } from "../diff-layout";

interface Props {
  rows: DiffRow[];
  onExpandGap: (id: number) => void;
}

const NUMBER = "min-w-[2.5ch] select-none px-1 text-right text-fg-faint sm:min-w-[4ch] sm:px-2";

// A unified diff, one grid row per line: old number, new number, sign, text.
// Read only: rows select like text and open nothing.
export default function DiffLines({ rows, onExpandGap }: Props) {
  return (
    <div className={`text-ui-footnote ${CODE_FONT}`}>
      {rows.map((row, index) => {
        if (row.kind === "gap") {
          return (
            <Button
              key={`gap-${row.id}`}
              variant="unstyled"
              onClick={() => onExpandGap(row.id)}
              className="w-full bg-surface-raised px-3 py-1 text-left text-ui-caption text-fg-faint"
            >
              Show {row.count.toLocaleString("en-US")} unchanged {row.count === 1 ? "line" : "lines"}
            </Button>
          );
        }
        const tint = row.kind === "add" ? ADD_ROW : row.kind === "del" ? DEL_ROW : "";
        return (
          <div key={index} className={`grid grid-cols-[auto_auto_1.25em_1fr] ${tint}`}>
            <span className={NUMBER}>{row.kind === "add" ? "" : row.oldNo}</span>
            <span className={NUMBER}>{row.kind === "del" ? "" : row.newNo}</span>
            <span aria-hidden className={`select-none text-center ${row.kind === "add" ? ADD_SIGN : row.kind === "del" ? DEL_SIGN : ""}`}>
              {row.kind === "add" ? "+" : row.kind === "del" ? "−" : ""}
            </span>
            <span className="whitespace-pre-wrap break-words pr-3">{row.text}</span>
          </div>
        );
      })}
    </div>
  );
}
