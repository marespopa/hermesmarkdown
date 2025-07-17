import React from "react";
import { containerStyle } from "../constants/styles";

export default function Prices() {
  const code = {
    headers: `# Heading 1
    ## Heading 2
    ### Heading 3`,
    emphasis: `**Bold Text**
    *Italic Text*
    ~~Strikethrough Text~~`,
    lists: {
      unordered: `- Item 1
    - Item 2
    - Item 3`,
      ordered: `1. Item 1
    2. Item 2
    3. Item 3`,
    },
    links: `[Visit Hermes Markdown](https://hermesmarkdown.com/)`,
    images: `![Alt Text](Image URL)`,
    codeBlocks: `~~~
    console.log("Hello, world!")
    ~~~`,
    tables: `| Header 1 | Header 2 |
    | -------- | -------- |
    | Cell 1   | Cell 2   |
    | Cell 3   | Cell 4   |`,
    shortcuts: `
    CTRL+S - Save File
    CTRL+N - New File
    CTRL+O - Import File
    CTRL+E - Open Export Preview`,
  } as const;

  return (
    <main className="bg-white dark:bg-gray-900 mt-8 pt-8 text-gray-900 dark:text-white">
      <div className="container max-w-screen-xl mx-auto px-4 sm:px-2">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <section>
            <h1>Documentation</h1>
            <p>
              Welcome to the <strong>Hermes Markdown</strong> Markdown Syntax
              Guide. This documentation provides a comprehensive overview of the
              Markdown syntax supported by Hermes Markdown.
            </p>
            <p>
              Markdown is a lightweight markup language that allows you to
              format text and add elements such as headers, lists, links, and
              more.
            </p>
            <h3>Table of Contents</h3>
            <ol>
              <li>
                <a href="#headers" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Headers</a>
              </li>
              <li>
                <a href="#emphasis" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Emphasis and Styling</a>
              </li>
              <li>
                <a href="#lists" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Lists</a>
              </li>
              <li>
                <a href="#links" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Links</a>
              </li>
              <li>
                <a href="#images" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Images</a>
              </li>
              <li>
                <a href="#code-blocks" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Code Blocks</a>
              </li>
              <li>
                <a href="#tables" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Tables</a>
              </li>
              <li>
                <a href="#keyboard-shortcuts" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Keyboard Shortcuts</a>
              </li>
            </ol>
          </section>

          {/* Headers Section */}
          <section id="headers">
            <h3>1. Headers</h3>
            <p>
              Headers in Markdown are used to denote different levels of section
              headings. To create headers, use the hash symbol (<em>#</em>)
              followed by a space. The number of hash symbols determines the
              header level:
            </p>
            <pre className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{code.headers}</code>
            </pre>
          </section>

          {/* Emphasis Section */}
          <section id="emphasis">
            <h3>2. Emphasis and Styling</h3>
            <p>
              You can add emphasis and styling to your text using a variety of
              Markdown syntax:
            </p>
            <ul>
              <li>
                <strong>Bold:</strong> Enclose the text in double asterisks
                (**).
              </li>
              <li>
                <strong>Italic:</strong> Enclose the text in single asterisks
                (*).
              </li>
              <li>
                <strong>Strikethrough:</strong> Enclose the text in double
                tildes (~~).
              </li>
            </ul>
            <pre className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{code.emphasis}</code>
            </pre>
          </section>

          {/* Lists Section */}
          <section id="lists">
            <h3>3. Lists</h3>
            <p>Markdown supports both ordered and unordered lists.</p>
            <p>
              To create an unordered list, use hyphens (-), plus signs (+), or
              asterisks (*) followed by a space:
            </p>
            <pre className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{code.lists.unordered}</code>
            </pre>
            <p className="mt-md">
              To create an ordered list, use numbers followed by periods (.) and
              a space:
            </p>
            <pre className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{code.lists.ordered}</code>
            </pre>
          </section>

          {/* Links Section */}
          <section id="links">
            <h3>4. Links</h3>
            <p>
              You can add hyperlinks to your Markdown files using the following
              syntax:
            </p>
            <pre className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{code.links}</code>
            </pre>
          </section>

          {/* Images Section */}
          <section id="images">
            <h3>5. Images</h3>
            <p>
              To insert images into your Markdown files, use the following
              syntax:
            </p>
            <pre className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{code.images}</code>
            </pre>
          </section>

          {/* Code Blocks Section */}
          <section id="code-blocks">
            <h3>6. Code Blocks</h3>
            <p>
              To display code blocks or inline code, use backticks (`) to
              enclose the code.
            </p>
            <p>For code blocks, you can use triple tilde characters (~):</p>
            <pre className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{code.codeBlocks}</code>
            </pre>
          </section>

          {/* Tables Section */}
          <section id="tables">
            <h3>7. Tables</h3>
            <p>
              To create tables, use hyphens (-) to separate the header row and
              pipes (|) to separate the columns:
            </p>
            <pre className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{code.tables}</code>
            </pre>
          </section>

          <section>
            <p>
              This concludes the Hermes{" "}
              <strong> Notes Markdown Syntax Guide.</strong> With these Markdown
              syntax elements at your disposal , you can create well -
              structured and visually appealing content in Hermes Markdown.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
