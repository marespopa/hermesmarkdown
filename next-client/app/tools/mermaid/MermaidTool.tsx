"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { atom_mermaidToolSource } from "@/app/atoms/tool-atoms";
import Button from "@/app/components/Button";
import { Select, Textarea } from "@/app/components/Input";
import { showCopyToast, showErrorToast } from "@/app/components/Toastr";
import MermaidViewer from "@/app/editor/components/MermaidViewer";
import { useDialog } from "@/app/hooks/use-dialog";
import { mermaidFence } from "../utils/tool-markdown";
import { MERMAID_EXAMPLES } from "./mermaid-examples";
import MermaidOpenButton from "./MermaidOpenButton";
import { useLiveMermaid } from "./use-live-mermaid";

const isExample = (source: string) => MERMAID_EXAMPLES.some((example) => example.source === source);

// Mermaid in Markdown: diagram source on the left, a live preview on the
// right (stacked on narrow screens), rendered 400 ms after typing stops.
// The preview fits the diagram once, then keeps the reader's zoom while
// they type; loading an example fits again. The source persists in this tab
// (atom_mermaidToolSource).
export default function MermaidTool() {
  const [stored, setSource] = useAtom(atom_mermaidToolSource);
  const source = stored ?? MERMAID_EXAMPLES[0].source;
  const { svg, error, loading } = useLiveMermaid(source);
  const [fitRequest, setFitRequest] = useState(0);
  const dialog = useDialog();
  const block = `${mermaidFence(source)}mermaid\n${source.trim()}\n${mermaidFence(source)}`;

  const loadExample = async (id: string) => {
    const example = MERMAID_EXAMPLES.find((entry) => entry.id === id);
    if (!example) return;
    // Edits are worth a question; an empty box or an untouched example isn't.
    if (source.trim() && !isExample(source)) {
      const confirmed = await dialog.confirm(
        "Your current diagram will be replaced.",
        `Replace your diagram with the ${example.label} example?`,
        "Replace",
        "Cancel",
      );
      if (!confirmed) return;
    }
    setSource(example.source);
    setFitRequest((request) => request + 1);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block);
      showCopyToast("Markdown copied");
    } catch {
      showErrorToast("Couldn't copy. Select the source and copy it instead.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <Select
            name="mermaid-example"
            label="Start from an example"
            value=""
            options={[{ value: "", label: "Choose a diagram type…" }, ...MERMAID_EXAMPLES.map(({ id, label }) => ({ value: id, label }))]}
            handleChange={(event) => void loadExample(event.target.value)}
            compact
            fullWidth
          />
          <Textarea
            name="mermaid-source"
            label="Mermaid"
            value={source}
            handleChange={(event) => setSource(event.target.value)}
            placeholder={"flowchart TD\n  A --> B"}
            spellCheck={false}
            textareaClassName="font-mono min-h-[420px] text-ui-footnote"
          />
        </div>
        <div className="min-w-0 md:pt-[84px]">
          <MermaidViewer
            svg={svg}
            loading={loading}
            error={error}
            fit="first"
            fitRequest={fitRequest}
            className="h-[420px]"
            downloadName="diagram.svg"
            emptyText="Type a diagram to see it here."
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <MermaidOpenButton />
        <Button variant="outlined" onClick={copy} isDisabled={!source.trim()}>
          Copy Markdown
        </Button>
      </div>
    </div>
  );
}
