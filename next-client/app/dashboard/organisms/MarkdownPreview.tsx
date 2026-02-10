/* eslint-disable */

import React, { ClassAttributes, HTMLAttributes } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";

type Props = {
  content: string;
  className?: string;
};

const MarkdownPreview = ({ content, className }: Props) => {
  if (content?.length === 0) {
    return (
      <div data-testid="preview">
        <p className="text-gray-700 dark:text-gray-300">The file is currently empty...</p>
      </div>
    );
  }

  // Split content into lines for scroll-to-line
  const lines = content.split("\n");

  return (
    <div data-testid="preview" className={`prose dark:prose-invert dark:bg-gray-900 ${className || ''}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <SyntaxHighlighter style={docco} PreTag="div" language={match[1]}>
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code {...rest} className={className}>
                {children}
              </code>
            );
          },
          p(props) {
            // Render each paragraph as a span with data-line attribute
            const { children, ...rest } = props;
            // Try to find the line number by matching the text
            const text = String(children);
            const lineIndex = lines.findIndex((l) => l.trim() && text.includes(l.trim()));
            return (
              <span data-line={lineIndex} {...rest} style={{ display: 'block' }}>
                {children}
              </span>
            );
          },
          h1(props) {
            // Custom h1 with minimal top margin
            const { children, ...rest } = props;
            return (
              <h1 {...rest} style={{ marginTop: 0 }}>
                {children}
              </h1>
            );
          },
          ul(props) {
            // Check if any list item contains the • character
            const { children, ...rest } = props;
            const hasBullet = React.Children.toArray(children).some(child => {
              if (React.isValidElement(child) && child.type === 'li') {
                const childProps = child.props as { children?: React.ReactNode };
                const text = String(childProps.children || '');
                return text.includes('•');
              }
              return false;
            });
            
            const className = hasBullet ? 'bullet-list' : '';
            return (
              <ul {...rest} className={className}>
                {children}
              </ul>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};

export default MarkdownPreview;
