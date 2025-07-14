import React, { useEffect, useState, useRef } from "react";
import Loading from "@/app/components/Loading/Loading";
import BlockEditor from "./BlockEditor/BlockEditor";

interface Block {
  id: string;
  type: "text" | "heading";
  content: string;
}

interface Props {
  contentEdited: string;
  setContentEdited: (content: string) => void;
  setHasChanges: (hasChanges: boolean) => void;
  fontFamily: string;
  fontSize: string;
}

function parseMarkdownType(content: string): "text" | "heading" {
  if (/^#\s/.test(content)) return "heading";
  return "text";
}

function blockToMarkdown(block: Block): string {
  if (block.type === "heading") return `# ${block.content.replace(/^#\s/, "")}`;
  return block.content;
}

function markdownToBlocks(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  return lines.map((line, i) => {
    const type = parseMarkdownType(line);
    return {
      id: `block-${i}-${Date.now()}`,
      type,
      content: type === "heading" ? line.replace(/^#\s/, "") : line,
    };
  });
}

export default function EditorContent({
  contentEdited,
  setContentEdited,
  setHasChanges,
  fontFamily,
  fontSize,
}: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>(() => markdownToBlocks(contentEdited || ""));
  const [focused, setFocused] = useState<string>(blocks[0]?.id || "block-0");
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevContentEdited = useRef(contentEdited);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update blocks if contentEdited changes (e.g. new file/template loaded)
  useEffect(() => {
    // Only update blocks if contentEdited is different from current blocks' markdown
    const currentMarkdown = blocks.map(blockToMarkdown).join("\n");
    if (contentEdited !== currentMarkdown) {
      setBlocks(markdownToBlocks(contentEdited || ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentEdited]);

  // Sync blocks to markdown string
  useEffect(() => {
    const markdown = blocks.map(blockToMarkdown).join("\n");
    if (markdown !== contentEdited) {
      setContentEdited(markdown);
      setHasChanges(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  useEffect(() => {
    // Focus the current block
    if (focused && blockRefs.current[focused]) {
      blockRefs.current[focused]?.focus();
    }
  }, [focused]);

  if (!isMounted) {
    return <Loading />;
  }

  const proseClass = fontSize || "prose-base";

  function updateBlockContent(id: string, html: string) {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? { ...block, content: html, type: parseMarkdownType(html) }
          : block
      )
    );
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>, id: string) {
    const html = (e.target as HTMLDivElement).innerText;
    updateBlockContent(id, html);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>, idx: number, id: string) {
    if (e.key === "Enter") {
      e.preventDefault();
      const html = (e.target as HTMLDivElement).innerText;
      updateBlockContent(id, html);
      setBlocks((prev) => {
        const newId = `block-${Date.now()}`;
        const newBlocks: Block[] = [
          ...prev.slice(0, idx + 1),
          { id: newId, type: "text", content: "" },
          ...prev.slice(idx + 1),
        ];
        setTimeout(() => setFocused(newId), 0);
        return newBlocks;
      });
    } else if (e.key === "Backspace") {
      if (blocks[idx].content === "" && blocks.length > 1) {
        e.preventDefault();
        setBlocks((prev) => {
          const newBlocks = prev.filter((block) => block.id !== id);
          const prevIdx = idx > 0 ? idx - 1 : 0;
          setTimeout(() => setFocused(newBlocks[prevIdx].id), 0);
          return newBlocks;
        });
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx > 0) setFocused(blocks[idx - 1].id);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (idx < blocks.length - 1) setFocused(blocks[idx + 1].id);
    }
  }

  return (
    <div className="my-4 sm:my-6">
      <div className="rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white/80 dark:bg-gray-900/80 p-2 sm:p-0 w-full max-w-full sm:max-w-screen-xl mx-auto">
        <BlockEditor
          contentEdited={contentEdited}
          setContentEdited={setContentEdited}
          setHasChanges={setHasChanges}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
}
