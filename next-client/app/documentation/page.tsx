import React from "react";
import Link from "next/link";

const linkStyle = "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300";

export default function Documentation() {
  return (
    <main className="bg-white dark:bg-gray-900 mt-8 pt-8 text-gray-900 dark:text-white">
      <div className="container max-w-screen-xl mx-auto px-4 sm:px-2">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <section>
            <h1>Hermes Markdown Documentation</h1>
            <p>
              Welcome to <strong>Hermes Markdown</strong>, your privacy-first markdown editor built for prompt engineering. This guide covers everything from quick start basics to advanced features like slash commands and document templates.
            </p>
          </section>

          {/* Table of Contents */}
          <section>
            <h3>Table of Contents</h3>
            <ol>
              <li><a href="#quick-start" className={linkStyle}>Quick Start</a></li>
              <li><a href="#slash-commands" className={linkStyle}>Slash Commands</a></li>
              <li><a href="#document-templates" className={linkStyle}>Document Templates</a></li>
              <li><a href="#metrics" className={linkStyle}>Token & Quality Metrics</a></li>
              <li><a href="#editor-features" className={linkStyle}>Editor Features</a></li>
              <li><a href="#table-editor" className={linkStyle}>Table Editor</a></li>
              <li><a href="#zen-mode" className={linkStyle}>Zen Mode</a></li>
              <li><a href="#export-import" className={linkStyle}>Export & Import</a></li>
              <li><a href="#find-replace" className={linkStyle}>Find & Replace</a></li>
              <li><a href="#timer" className={linkStyle}>Timer</a></li>
              <li><a href="#shortcuts" className={linkStyle}>Keyboard Shortcuts</a></li>
              <li><a href="#offline-pwa" className={linkStyle}>Offline & PWA</a></li>
              <li><a href="#privacy-security" className={linkStyle}>Privacy & Security</a></li>
              <li><a href="#markdown-syntax" className={linkStyle}>Markdown Syntax Guide</a></li>
            </ol>
          </section>

          {/* Quick Start */}
          <section id="quick-start">
            <h2>Quick Start</h2>
            <p>Get started with Hermes Markdown in three steps:</p>
            <ol>
              <li><strong>Create or import a file:</strong> Start with a blank file, select a template, or import an existing <code>.md</code> or <code>.txt</code> file.</li>
              <li><strong>Use slash commands:</strong> Type <code>/</code> in the editor to access 35+ prompt engineering templates. Start typing to filter commands.</li>
              <li><strong>Export your work:</strong> Save as PDF or Markdown, or use Copy Prompt to copy clean text without YAML frontmatter.</li>
            </ol>
            <p>
              Access the editor from the <Link href="/dashboard/editor" className={linkStyle}>Dashboard</Link> to begin writing.
            </p>
          </section>

          {/* Slash Commands */}
          <section id="slash-commands">
            <h2>Slash Commands</h2>
            <p>
              Slash commands are Hermes Markdown core feature for prompt engineering. Type <code>/</code> anywhere in the editor to open the command palette, then type to filter. Press <b>Enter</b> or click to insert the template at your cursor position.
            </p>

            <h3>Prompt Foundation</h3>
            <p>Build strong prompts from scratch:</p>
            <ul>
              <li><code>/structure</code> - Scaffold a complete prompt layout (Role, Context, Task, Constraints, Output format)</li>
              <li><code>/success</code> - Define what done means and how to judge it</li>
              <li><code>/plan</code> - Outline steps, milestones, and verification</li>
              <li><code>/constraints</code> - Scope, assumptions, exclusions, and uncertainty handling</li>
              <li><code>/inputs</code> - Minimum context and required data sources</li>
              <li><code>/output</code> - Specify format, length, tone, and required sections</li>
            </ul>

            <h3>Prompt Refinement</h3>
            <p>Polish and validate what you wrote:</p>
            <ul>
              <li><code>/verify</code> - Checklist to catch common failures</li>
              <li><code>/examples</code> - Add 1-3 examples when format or style matters</li>
              <li><code>/iterate</code> - Ask clarifying questions or propose alternatives</li>
              <li><code>/critique</code> - Highlight gaps, logic, and clarity issues</li>
            </ul>

            <h3>Content Transformation</h3>
            <p>Daily operations on existing content:</p>
            <ul>
              <li><code>/summarize</code> - Condense content into short bullets</li>
              <li><code>/extract</code> - Pull actionable items with owners</li>
              <li><code>/outline</code> - Create a structured outline with headings</li>
              <li><code>/explain</code> - Explain for a target audience with examples</li>
              <li><code>/rewrite</code> - Adapt tone and audience while preserving meaning</li>
              <li><code>/fix</code> - Improve grammar and clarity without changing meaning</li>
              <li><code>/translate</code> - Translate while preserving key terms</li>
              <li><code>/compare</code> - Side-by-side comparison by criteria</li>
            </ul>

            <h3>Content Generation</h3>
            <p>Create new content:</p>
            <ul>
              <li><code>/idea</code> - Generate multiple ideas with constraints</li>
              <li><code>/steps</code> - Break work into ordered steps</li>
              <li><code>/email</code> - Draft an email with tone and subject</li>
              <li><code>/spec</code> - Outline a concise product or feature spec</li>
              <li><code>/meeting</code> - Summarize decisions, actions, and questions</li>
              <li><code>/todo</code> - Convert content into actionable tasks</li>
            </ul>

            <h3>Technical</h3>
            <p>Developer-focused templates:</p>
            <ul>
              <li><code>/documentation</code> - Write user or developer documentation</li>
              <li><code>/refactor</code> - Refactor code or components safely</li>
              <li><code>/code</code> - Generate code with language and style hints</li>
              <li><code>/unit-test</code> - Write unit tests for a component</li>
              <li><code>/test</code> - Generate test scenarios and expected results</li>
              <li><code>/sql</code> - Draft SQL with tables and constraints</li>
              <li><code>/bug</code> - Short bug report scaffold</li>
              <li><code>/issue</code> - Research issue first, then generate a spec-first prompt</li>
            </ul>

            <h3>Specialized</h3>
            <p>Niche and advanced templates:</p>
            <ul>
              <li><code>/qa</code> - Generate question and answer pairs</li>
              <li><code>/rubric</code> - Build a criteria-based scoring rubric</li>
              <li><code>/generic</code> - Quick structure for goals, constraints, and output</li>
            </ul>
          </section>

          {/* Document Templates */}
          <section id="document-templates">
            <h2>Document Templates</h2>
            <p>
              Full document templates provide complete prompt structures for complex tasks. Access them via the template picker (<b>⌘/Ctrl + Shift + M</b>) or from the sidebar.
            </p>

            <h3>General</h3>
            <ul>
              <li><strong>Generic Task</strong> - All-purpose task prompt structure</li>
              <li><strong>Task Prompt Generator</strong> - Meta-template to generate other prompts</li>
            </ul>

            <h3>Architecture & Design</h3>
            <ul>
              <li><strong>System Contract</strong> - Define system behavior and boundaries</li>
              <li><strong>Component Refactor</strong> - Plan component restructuring</li>
              <li><strong>Database Schema</strong> - Design database structures</li>
            </ul>

            <h3>Testing & Security</h3>
            <ul>
              <li><strong>Security Red Team</strong> - Security review and vulnerability analysis</li>
              <li><strong>Unit Test Suite</strong> - Comprehensive test planning</li>
            </ul>

            <h3>Analysis & Logic</h3>
            <ul>
              <li><strong>Balanced Decision</strong> - Pros/cons decision framework</li>
              <li><strong>Step-by-Step Reasoning</strong> - Chain-of-thought prompting</li>
              <li><strong>Structural Critique</strong> - Systematic content review</li>
              <li><strong>Legacy Modernization</strong> - Plan codebase upgrades</li>
            </ul>

            <h3>Communication</h3>
            <ul>
              <li><strong>PR Description</strong> - Pull request documentation</li>
              <li><strong>Release Notes</strong> - Version changelog formatting</li>
              <li><strong>Post Mortem</strong> - Incident analysis and learnings</li>
              <li><strong>Incident Update</strong> - Status communication during outages</li>
              <li><strong>Stakeholder Brief</strong> - Executive summaries</li>
              <li><strong>Status Update</strong> - Project progress reports</li>
              <li><strong>Meeting Summary</strong> - Meeting notes with action items</li>
              <li><strong>Decision Record</strong> - Document architectural decisions</li>
              <li><strong>Roadmap Brief</strong> - Product direction overview</li>
              <li><strong>Customer Update</strong> - External communication templates</li>
            </ul>
          </section>

          {/* Metrics */}
          <section id="metrics">
            <h2>Token & Quality Metrics</h2>
            <p>Hermes Markdown provides real-time metrics to help you optimize your prompts:</p>
            <ul>
              <li><strong>Token Estimation:</strong> Approximate token count calculated as <code>word count × 1.35</code>. Useful for staying within LLM context limits.</li>
              <li><strong>Reading Ease Score:</strong> Flesch-based clarity analysis. Higher scores indicate easier-to-read text. Aim for 60+ for general audiences.</li>
              <li><strong>Word Count:</strong> Total words in your document, updated in real-time.</li>
            </ul>

            <h3>Copy Prompt</h3>
            <p>
              The <strong>Copy Prompt</strong> button copies your document content to the clipboard <em>without</em> the YAML frontmatter. This gives you clean prompt text ready to paste directly into any LLM interface.
            </p>
          </section>

          {/* Editor Features */}
          <section id="editor-features">
            <h2>Editor Features</h2>
            <ul>
              <li><strong>Live Markdown Preview:</strong> See rendered output as you type with side-by-side or tabbed view.</li>
              <li><strong>Font Customization:</strong> Choose from multiple monospace fonts (JetBrains Mono, Fira Code, Source Code Pro, IBM Plex Mono, Roboto Mono, Cascadia Code).</li>
              <li><strong>Theme Support:</strong> Light and dark themes that respect your system preference.</li>
              <li><strong>Metadata Editing:</strong> Edit file name, title, description, and tags via the document properties dialog.</li>
              <li><strong>Autosave:</strong> Your work is automatically saved to browser storage. Unsaved changes are indicated in the UI.</li>
              <li><strong>Responsive Design:</strong> Full support for desktop and mobile with collapsible sidebar on smaller screens.</li>
            </ul>
          </section>

          {/* Table Editor */}
          <section id="table-editor">
            <h2>Table Editor</h2>
            <p>
              Create and edit markdown tables visually with the <strong>Table Editor</strong>. No need to write table syntax manually.
            </p>
            <ul>
              <li><strong>Create New Tables:</strong> Start with a blank table and add rows/columns as needed.</li>
              <li><strong>Edit Existing Tables:</strong> Import existing markdown tables and modify them visually.</li>
              <li><strong>Add/Remove Rows & Columns:</strong> Dynamically adjust table structure with toolbar controls.</li>
              <li><strong>Inline Cell Editing:</strong> Click any cell to edit its content directly.</li>
              <li><strong>Automatic Markdown:</strong> Tables are formatted with proper markdown syntax automatically.</li>
            </ul>
            <p>
              Access via the sidebar, mobile menu, or keyboard shortcut <b>⌘/Ctrl + Shift + T</b>.
            </p>
          </section>

          {/* Zen Mode */}
          <section id="zen-mode">
            <h2>Zen Mode</h2>
            <p>
              <strong>Zen Mode</strong> provides a distraction-free writing environment. The editor is centered, UI elements are hidden, and you can focus entirely on your content.
            </p>
            <p>
              Toggle Zen Mode using the floating button in the editor. Press <b>Esc</b> to exit.
            </p>
          </section>

          {/* Export & Import */}
          <section id="export-import">
            <h2>Export & Import</h2>

            <h3>Import Formats</h3>
            <ul>
              <li><code>.md</code> - Markdown files with full frontmatter preservation</li>
              <li><code>.txt</code> - Plain text files</li>
            </ul>

            <h3>Export Formats</h3>
            <ul>
              <li><strong>PDF:</strong> Print-friendly export with clean styling. Use <b>⌘/Ctrl + Shift + E</b> or the PDF icon.</li>
              <li><strong>Markdown:</strong> Export as <code>.md</code> file with all metadata preserved. Use <b>⌘/Ctrl + Shift + Y</b>.</li>
              <li><strong>Copy Prompt:</strong> Copy clean prompt text without YAML frontmatter to clipboard.</li>
            </ul>

            <h3>YAML Frontmatter</h3>
            <p>
              Hermes Markdown preserves YAML frontmatter when importing and exporting markdown files. Frontmatter contains metadata like title, description, and tags:
            </p>
            <pre><code>{`---
title: My Prompt
description: A sample prompt
tags: [prompt, example]
---`}</code></pre>
          </section>

          {/* Find & Replace */}
          <section id="find-replace">
            <h2>Find & Replace</h2>
            <p>
              Quickly search your document using the floating FindBar (<b>⌘/Ctrl + F</b>). Navigate between matches with arrow buttons and use the replace functionality for advanced editing.
            </p>
          </section>

          {/* Timer */}
          <section id="timer">
            <h2>Timer</h2>
            <p>
              The built-in <strong>Timer</strong> helps you maintain focus with timed writing sessions.
            </p>
            <ul>
              <li><strong>Start/Pause:</strong> Use the play/pause button to control your session.</li>
              <li><strong>Reset:</strong> Restart the current interval from the beginning.</li>
              <li><strong>Configure Duration:</strong> Open timer settings (gear icon) to set custom duration.</li>
              <li><strong>Notifications & Sounds:</strong> Receive alerts when sessions end (requires browser permission).</li>
              <li><strong>Minimize:</strong> Keep the timer running in compact mode while you write.</li>
            </ul>
            <p>Access the timer from the main toolbar. On mobile, it appears at the bottom of the screen.</p>
          </section>

          {/* Keyboard Shortcuts */}
          <section id="shortcuts">
            <h2>Keyboard Shortcuts</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="text-left">Shortcut</th>
                    <th className="text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  <tr><td><b>⌘/Ctrl + Shift + U</b></td><td>New File</td></tr>
                  <tr><td><b>⌘/Ctrl + Shift + I</b></td><td>Import File</td></tr>
                  <tr><td><b>⌘/Ctrl + Shift + Y</b></td><td>Export to Markdown</td></tr>
                  <tr><td><b>⌘/Ctrl + Shift + E</b></td><td>Export to PDF</td></tr>
                  <tr><td><b>⌘/Ctrl + Shift + M</b></td><td>Select Template</td></tr>
                  <tr><td><b>⌘/Ctrl + Shift + T</b></td><td>Table Editor</td></tr>
                  <tr><td><b>⌘/Ctrl + Shift + H</b></td><td>Go to Dashboard</td></tr>
                  <tr><td><b>⌘/Ctrl + F</b></td><td>Open FindBar</td></tr>
                  <tr><td><b>/</b></td><td>Open Slash Command Palette</td></tr>
                  <tr><td><b>Esc</b></td><td>Close Dialogs / Exit Zen Mode</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Offline & PWA */}
          <section id="offline-pwa">
            <h2>Offline & PWA</h2>
            <p>Hermes Markdown works fully offline after the initial page load.</p>
            <ul>
              <li><strong>Local Storage:</strong> All documents are saved in your browser&apos;s local storage. No internet required for writing or editing.</li>
              <li><strong>Progressive Web App:</strong> Install Hermes Markdown as a standalone app on your device. Look for the install prompt in your browser or use the &quot;Add to Home Screen&quot; option.</li>
              <li><strong>No Account Required:</strong> Start writing immediately without sign-up or login.</li>
            </ul>
          </section>

          {/* Privacy & Security */}
          <section id="privacy-security">
            <h2>Privacy & Security</h2>
            <p>Hermes Markdown is designed with privacy as a core principle:</p>
            <ul>
              <li><strong>Local-Only Storage:</strong> All content stays in your browser. Nothing is uploaded to servers.</li>
              <li><strong>No Data Collection:</strong> We don&apos;t collect personal information, usage statistics, or document content.</li>
              <li><strong>No Tracking:</strong> No analytics, cookies, or third-party trackers.</li>
              <li><strong>Open Source:</strong> The code is available on GitHub for full transparency.</li>
              <li><strong>Works Offline:</strong> After initial load, no internet connection is needed.</li>
            </ul>
            <p>
              For complete details, see our <Link href="/privacy-policy" className={linkStyle}>Privacy Policy</Link>.
            </p>
          </section>

          {/* Markdown Syntax Guide */}
          <section id="markdown-syntax">
            <h2>Markdown Syntax Guide</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="text-left">Element</th>
                    <th className="text-left">Syntax</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  <tr><td>Headers</td><td><code># H1</code>, <code>## H2</code>, <code>### H3</code></td></tr>
                  <tr><td>Bold</td><td><code>**bold**</code></td></tr>
                  <tr><td>Italic</td><td><code>*italic*</code></td></tr>
                  <tr><td>Strikethrough</td><td><code>~~strike~~</code></td></tr>
                  <tr><td>Unordered List</td><td><code>- item</code></td></tr>
                  <tr><td>Ordered List</td><td><code>1. item</code></td></tr>
                  <tr><td>Link</td><td><code>[text](url)</code></td></tr>
                  <tr><td>Image</td><td><code>![alt](url)</code></td></tr>
                  <tr><td>Inline Code</td><td><code>`code`</code></td></tr>
                  <tr><td>Code Block</td><td><code>```language</code></td></tr>
                  <tr><td>Blockquote</td><td><code>&gt; quote</code></td></tr>
                  <tr><td>Horizontal Rule</td><td><code>---</code></td></tr>
                  <tr><td>Task List</td><td><code>- [ ] task</code></td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              <b>Tip:</b> When you select a link in the editor, a popup appears allowing you to open it directly.
            </p>
            <p>
              For more details, see the{" "}
              <a
                href="https://www.markdownguide.org/basic-syntax/"
                className={linkStyle}
                target="_blank"
                rel="noopener noreferrer"
              >
                Markdown Guide
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
