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
    CTRL+O - Open File
    CTRL+E - Open Export Preview`,
  } as const;

  return (
    <main className="p-4 md:px-2 bg-white">
      <div className={`${containerStyle}`}>
        <div className="prose">
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
                <a href="#headers">Headers</a>
              </li>
              <li>
                <a href="#emphasis">Emphasis and Styling</a>
              </li>
              <li>
                <a href="#lists">Lists</a>
              </li>
              <li>
                <a href="#links">Links</a>
              </li>
              <li>
                <a href="#images">Images</a>
              </li>
              <li>
                <a href="#code-blocks">Code Blocks</a>
              </li>
              <li>
                <a href="#tables">Tables</a>
              </li>
              <li>
                <a href="#keyboard-shortcuts">Keyboard Shortcuts</a>
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
            <pre>
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
            <pre>
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
            <pre>
              <code>{code.lists.unordered}</code>
            </pre>
            <p className="mt-md">
              To create an ordered list, use numbers followed by periods (.) and
              a space:
            </p>
            <pre>
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
            <pre>
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
            <pre>
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
            <pre>
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
            <pre>
              <code>{code.tables}</code>
            </pre>
          </section>

          {/* Keyboard Shortcuts Section */}
          <section id="keyboard-shortcuts">
            <h3>8. Keyboard Shortcuts</h3>
            <p>
              The following keyboard shortcuts are available for quick actions
              in Hermes Markdown:
            </p>
            <ul className="list-disc ml-6">
              {Object.entries(code.shortcuts.split("\n").filter(Boolean)).map(
                ([_, shortcut], index) =>
                  shortcut && <li key={index}>{shortcut}</li>
              )}
            </ul>
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
