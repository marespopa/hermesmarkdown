/* eslint-disable */
import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw"; // Add this to allow our styled spans
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";

type Props = {
  content: string;
  className?: string;
};

const MarkdownPreview = ({ content, className }: Props) => {
  if (!content || content.length === 0) {
    return (
      <div data-testid="preview" className="p-4">
        <p className="text-neutral-400 italic">The file is currently empty...</p>
      </div>
    );
  }

  /**
   * PRE-PROCESSOR: 
   * 1. Escapes XML tags so they aren't swallowed as HTML.
   * 2. Wraps them in a styled span to match your Amber theme.
   */
  const processedContent = React.useMemo(() => {
    return content.replace(
      /<(\/?[a-zA-Z0-9_]+)>/g,
      `<span class="text-amber-600 font-mono font-bold">&lt;$1&gt;</span>`
    );
  }, [content]);

  const lines = content.split("\n");

  return (
    <div 
      data-testid="preview" 
      className={`prose prose-neutral dark:prose-invert max-w-none px-4 py-2 ${className || ''}`}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]} // Enables the amber-styled spans
        components={{
          // Syntax Highlighting for Code Blocks
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <SyntaxHighlighter 
                style={docco} 
                PreTag="div" 
                language={match[1]}
                className="rounded-lg border border-neutral-100 dark:border-neutral-800"
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code {...rest} className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-amber-700 dark:text-amber-400 font-mono text-sm">
                {children}
              </code>
            );
          },

          // Line-aware Paragraph Rendering
          p(props) {
            const { children } = props;
            const text = React.Children.toArray(children).join("");
            const lineIndex = lines.findIndex((l) => l.trim() && text.includes(l.trim()));
            
            return (
              <p 
                data-line={lineIndex} 
                className="leading-relaxed mb-4 text-neutral-800 dark:text-neutral-200"
              >
                {children}
              </p>
            );
          },

          // Minimalist Headings
          h1: ({node, ...props}) => <h1 className="text-2xl font-black text-neutral-900 dark:text-white mt-0 mb-4 tracking-tight" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mt-8 mb-3" {...props} />,
          
          // Custom List handling
          ul(props) {
            const { children } = props;
            const hasBullet = React.Children.toArray(children).some(child => {
              if (React.isValidElement(child)) {
                return String(child.props.children || '').includes('•');
              }
              return false;
            });
            
            return (
              <ul className={`list-none pl-4 space-y-2 ${hasBullet ? 'border-l-2 border-amber-100' : ''}`}>
                {children}
              </ul>
            );
          },
          li: ({node, ...props}) => <li className="relative before:content-['•'] before:absolute before:-left-4 before:text-amber-500" {...props} />
        }}
      >
        {processedContent}
      </Markdown>
    </div>
  );
};

export default MarkdownPreview;
