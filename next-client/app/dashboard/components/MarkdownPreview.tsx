/* eslint-disable */

import React, { ClassAttributes, HTMLAttributes } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";

type Props = {
  content: string;
};

const MarkdownPreview = ({ content }: Props) => {
  if (content?.length === 0) {
    return (
      <div data-testid="preview">
        <p className="text-gray-700 dark:text-gray-300">The file is currently empty...</p>
      </div>
    );
  }

  return (
    <div data-testid="preview" className="dark:bg-gray-900">
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
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};

export default MarkdownPreview;
