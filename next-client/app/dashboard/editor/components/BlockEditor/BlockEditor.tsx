import React, { useEffect, useState, useRef, useLayoutEffect, useCallback } from "react";
import BlockItem from "./BlockItem";
import BlockControls from "./BlockControls";
import {
  Block,
  parseMarkdownType,
  blockToMarkdown,
  generateBlockId,
  stableBlockId,
} from "./blockUtils";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface BlockEditorProps {
  contentEdited: string;
  setContentEdited: (content: string) => void;
  setHasChanges: (hasChanges: boolean) => void;
  fontFamily: string;
  fontSize: string;
}

function markdownToBlocks(md: string, prevBlocks: Block[] = []): Block[] {
  let lines = md.split(/\r?\n/);
  while (lines.length && lines[0] === "") lines.shift();
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  let cleaned: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== "" || cleaned[cleaned.length - 1] !== "") {
      cleaned.push(lines[i]);
    }
  }
  // If the number of lines matches prevBlocks, preserve IDs by index
  if (prevBlocks.length === cleaned.length) {
    return cleaned.map((line, i) => {
      const { type, headingLevel } = parseMarkdownType(line);
      if (
        prevBlocks[i] &&
        prevBlocks[i].content === (type === "heading" ? line.replace(/^#{1,3}\s/, "") : line) &&
        prevBlocks[i].type === type &&
        (type !== "heading" || prevBlocks[i].headingLevel === headingLevel)
      ) {
        return {
          ...prevBlocks[i],
          type,
          headingLevel,
          content: type === "heading" ? line.replace(/^#{1,3}\s/, "") : line,
        };
      }
      return {
        id: stableBlockId(line, i),
        type,
        headingLevel,
        content: type === "heading" ? line.replace(/^#{1,3}\s/, "") : line,
      };
    });
  }
  // Otherwise, generate stable IDs for all
  return cleaned.map((line, i) => {
    const { type, headingLevel } = parseMarkdownType(line);
    return {
      id: stableBlockId(line, i),
      type,
      headingLevel,
      content: type === "heading" ? line.replace(/^#{1,3}\s/, "") : line,
    };
  });
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  contentEdited,
  setContentEdited,
  setHasChanges,
  fontFamily,
  fontSize,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (!contentEdited || contentEdited.trim() === "") {
      return [{ id: generateBlockId(), type: 'text', content: '' }];
    }
    return markdownToBlocks(contentEdited || "");
  });
  const [focused, setFocused] = useState<string>(blocks[0]?.id || "block-0");
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const editorRef = useRef<HTMLDivElement | null>(null);
  // Remove drag selection state and logic
  // (delete selectedBlockIds, isSelecting, selectionStartIdx, dragAreaRef, drag area overlay, and related handlers/effects)

  useEffect(() => {
    setIsMounted(true);
    // Focus the first block if there is only one (empty) block
    if (blocks.length === 1 && blocks[0].content.trim() === "") {
      setFocused(blocks[0].id);
    }
    // Otherwise, do not set focus; allow user interaction to control focus
  }, []);

  // Focus first block when blocks are reset to a single empty block (new file)
  useEffect(() => {
    if (blocks.length === 1 && blocks[0].content.trim() === "") {
      setFocused(blocks[0].id);
    }
    // Do not auto-focus any block when loading new content otherwise
    // Only set focus when the user clicks or navigates
  }, [blocks]);

  // Only update blocks if contentEdited is different from current blocks' markdown
  useEffect(() => {
    const currentMarkdown = blocks.map(blockToMarkdown).join("\n");
    if (contentEdited !== currentMarkdown) {
      // Parse new blocks
      let newBlocks;
      if ((contentEdited || "").trim() === "") {
        const newId = generateBlockId();
        newBlocks = [{ id: newId, type: "text" as Block["type"], content: "" }];
      } else {
        newBlocks = markdownToBlocks(contentEdited || "", blocks);
      }
      // Only update if blocks are actually different
      const blocksChanged = newBlocks.length !== blocks.length ||
        newBlocks.some((b, i) => b.id !== blocks[i]?.id || b.content !== blocks[i]?.content || b.type !== blocks[i]?.type);
      if (blocksChanged) {
        setBlocks(newBlocks);
        setFocused(""); // Do not auto-focus any block after loading
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentEdited]);

  // Sync blocks to markdown string
  useEffect(() => {
    const markdown = blocks.map(blockToMarkdown).join("\n");
    const handler = setTimeout(() => {
      setContentEdited(markdown);
      setHasChanges(true);
    }, 300);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  useLayoutEffect(() => {
    if (focused && blockRefs.current[focused]) {
      try {
        blockRefs.current[focused].focus();
      } catch (e) {
        // Node may not be attached, ignore
      }
    }
  }, [blocks, focused]);

  // Track which block is hovered for contextual controls
  const [hovered, setHovered] = useState<string | null>(null);
  // Remove allSelected state and related logic

  const updateBlockContent = useCallback((id: string, html: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id === id) {
          const { type, headingLevel } = parseMarkdownType(html);
          if (type === "heading") {
            return { ...block, content: html.replace(/^#{1,3}\s/, ""), type: "heading", headingLevel };
          } else {
            return { ...block, content: html, type };
          }
        }
        return block;
      })
    );
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>, id: string) => {
    const html = (e.target as HTMLDivElement).innerText;
    const lines = html.split(/\r?\n/);
    const idx = blocks.findIndex(block => block.id === id);
    if (lines.length > 1) {
      setBlocks(prev => {
        const newBlocks = [
          ...prev.slice(0, idx),
          ...lines.map((line) => {
            const { type, headingLevel } = parseMarkdownType(line);
            return {
              id: generateBlockId(),
              type,
              headingLevel: type === "heading" ? headingLevel : undefined,
              content: type === "heading" ? line.replace(/^#{1,3}\s/, "") : line,
            };
          }),
          ...prev.slice(idx + 1),
        ];
        setFocused(newBlocks[idx + lines.length - 1]?.id || "");
        return newBlocks;
      });
    } else {
      updateBlockContent(id, html);
      // If this is the last block, not empty, and there is no empty block after, add a new empty block and focus it
      if (idx === blocks.length - 1 && html.trim() !== "") {
        setBlocks(prev => {
          if (prev[prev.length - 1].content.trim() === "") return prev;
          const newId = generateBlockId();
          setFocused(newId);
          return [
            ...prev,
            { id: newId, type: "text", content: "" },
          ];
        });
      }
    }
  }, [blocks, updateBlockContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, idx: number, id: string) => {

    if (!blocks[idx]) return; // Guard against undefined
    const html = (e.target as HTMLDivElement).innerText;
    const isList = /^([*\-+])\s+/.test(html) || /^\d+\.\s+/.test(html);

    if (e.key === "Enter") {
      e.preventDefault();
      // Split at cursor or for multi-line
      const selection = window.getSelection();
      let cursorPos = selection && selection.anchorOffset;
      let text = html;
      // If multi-line, split all lines
      const lines = text.split(/\r?\n/);
      if (lines.length > 1) {
        setBlocks(prev => {
          const newBlocks: Block[] = [
            ...prev.slice(0, idx),
            ...lines.map((line) => {
              const { type, headingLevel } = parseMarkdownType(line);
              return {
                id: generateBlockId(),
                type,
                headingLevel,
                content: line,
              };
            }),
            ...prev.slice(idx + 1),
          ];
          setFocused(newBlocks[idx + 1]?.id || "");
          return newBlocks;
        });
        return;
      }
      updateBlockContent(id, html);
      setBlocks((prev) => {
        const newId = generateBlockId();
        const newBlocks: Block[] = [
          ...prev.slice(0, idx + 1),
          { id: newId, type: "text", content: "" },
          ...prev.slice(idx + 1),
        ];
        setFocused(newId);
        return newBlocks;
      });
    } else if ((e.key === "Backspace" || e.key === "Delete")) {
      // If the block is empty (any type), and there is more than one block, and caret is at start, delete it
      const selection = window.getSelection();
      const isCaretAtStart = selection && selection.anchorOffset === 0 && selection.anchorNode && selection.anchorNode.textContent === html;
      if (blocks[idx].content === "" && blocks.length > 1 && isCaretAtStart) {
        e.preventDefault();
        setBlocks((prev) => {
          let newBlocks = prev.filter((block) => block.id !== id);
          if (blockRefs.current[id]) {
            delete blockRefs.current[id];
          }
          if (newBlocks.length === 0) {
            const newId = generateBlockId();
            newBlocks = [{ id: newId, type: "text", content: "" }];
            setFocused(newId);
          } else {
            const prevIdx = idx > 0 ? idx - 1 : 0;
            const newFocusedId = newBlocks[prevIdx]?.id || newBlocks[0].id;
            setFocused(newFocusedId);
          }
          return newBlocks;
        });
        return;
      }
      // Otherwise, let the default behavior occur (do not preventDefault)
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx > 0) setFocused(blocks[idx - 1].id);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (idx < blocks.length - 1) setFocused(blocks[idx + 1].id);
    }
  }, [blocks, updateBlockContent]);

  // Remove drag selection state and logic
  // (delete selectedBlockIds, isSelecting, selectionStartIdx, dragAreaRef, drag area overlay, and related handlers/effects)

  if (!isMounted) {
    return <div>Loading...</div>;
  }

  return (
    <div
      ref={editorRef}
      className={`p-4 w-full h-full min-h-[200px] sm:min-h-[500px] flex flex-col prose dark:prose-invert max-w-none transition-colors duration-200 prose-headings:mt-0 prose-headings:mb-2 prose-p:my-1 ${fontSize || "prose-base"}`}
      style={{ fontFamily }}
      tabIndex={0}
      onKeyDown={e => {
        // Only trigger if not already handled by a block
        // No allSelected logic
      }}
      onClick={e => {
        // Only clear focus if clicking outside the editor
        if (editorRef.current && e.target instanceof Node && !editorRef.current.contains(e.target as Node)) {
          setFocused("");
        }
      }}
    >
      <AnimatePresence
        initial={false}
        onExitComplete={() => {
          // Clean up refs for blocks that no longer exist
          const blockIds = new Set(blocks.map(b => b.id));
          Object.keys(blockRefs.current).forEach(id => {
            if (!blockIds.has(id)) {
              delete blockRefs.current[id];
            }
          });
        }}
      >
        {blocks.map((block, idx) => {
          const isFocused = focused === block.id;
          const isHovered = hovered === block.id;
          const isSelected = false;
          const isLast = idx === blocks.length - 1;
          const isPageEmpty = blocks.length === 1 && blocks[0].content.trim() === "";
          // Render as a content-editable block with placeholder if empty
          return (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              onMouseDown={() => {
                setFocused(block.id);
              }}
              onTouchStart={e => {
                setFocused(block.id);
              }}
            >
              <BlockItem
                block={block}
                isFocused={isFocused}
                isHovered={isHovered}
                isSelected={isSelected}
                isLast={isLast}
                onBlur={handleBlur as (e: React.FocusEvent<HTMLElement>, id: string) => void}
                onKeyDown={handleKeyDown as (e: React.KeyboardEvent<HTMLElement>, idx: number, id: string) => void}
                onFocus={() => setFocused(block.id)}
                onMouseEnter={() => setHovered(block.id)}
                onMouseLeave={() => setHovered(null)}
                blockRef={el => {
                  // Only update blockRefs for currently rendered blocks
                  if (el) {
                    blockRefs.current[block.id] = el as HTMLDivElement | null;
                  } else if (blockRefs.current[block.id]) {
                    delete blockRefs.current[block.id];
                  }
                }}
                BlockControls={
                  <BlockControls
                    isFocused={isFocused}
                    isHovered={isHovered}
                    onAddBlock={() => {
                      const newId = generateBlockId();
                      setBlocks(prev => [
                        ...prev.slice(0, idx + 1),
                        { id: newId, type: "text", content: "" },
                        ...prev.slice(idx + 1),
                      ]);
                      setFocused(newId);
                    }}
                    blockId={block.id}
                  />
                }
                idx={idx}
                isPageEmpty={isPageEmpty}
                onEscape={() => setFocused("")}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default BlockEditor; 