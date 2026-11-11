"use client";

import { useState } from "react";
import Button from "@/app/components/Button";
import { Textarea } from "@/app/components/Input";
import { delimitedTextToMarkdownTable, detectDelimitedTable } from "@/app/editor/utils/table-manipulation";

// "From CSV or spreadsheet": paste comma- or tab-separated text (a range
// copied from Excel, Numbers or Google Sheets is tab-separated) and convert
// it into the grid. Text without columns leaves the grid alone.
export default function TableCsvImport({ onConvert }: { onConvert: (table: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const convert = () => {
    const delimiter = detectDelimitedTable(text);
    if (!delimiter) {
      setError("Couldn't find comma- or tab-separated columns.");
      return;
    }
    onConvert(delimitedTextToMarkdownTable(text, delimiter));
    setError(null);
    setText("");
    setOpen(false);
  };

  if (!open) {
    return (
      <Button variant="outlined" onClick={() => setOpen(true)} aria-expanded={false}>
        From CSV or spreadsheet
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2">
      <Textarea
        name="table-csv"
        label="CSV or spreadsheet cells"
        value={text}
        handleChange={(event) => {
          setText(event.target.value);
          setError(null);
        }}
        placeholder={"Name,Role\nAda,Engineer"}
        spellCheck={false}
        textareaClassName="font-mono"
        helperText={error ?? "Paste comma- or tab-separated text. The first row becomes the header."}
      />
      <div className="flex gap-2">
        <Button variant="secondary" onClick={convert} isDisabled={!text.trim()}>
          Convert
        </Button>
        <Button variant="outlined" onClick={() => setOpen(false)} aria-expanded={true}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
