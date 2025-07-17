import React from "react";
import { containerStyle } from "../constants/styles";

export default function Documentation() {
  return (
    <main className="bg-white dark:bg-gray-900 mt-8 pt-8 text-gray-900 dark:text-white">
      <div className="container max-w-screen-xl mx-auto px-4 sm:px-2">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <section>
            <h1>Hermes Markdown Documentation</h1>
            <p>
              Welcome to <strong>Hermes Markdown</strong>! This guide will help you get the most out of the app, from writing and organizing notes to exporting and customizing your workspace.
            </p>
          </section>

          {/* Table of Contents */}
          <section>
            <h3>Table of Contents</h3>
            <ol>
              <li><a href="#getting-started" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Getting Started</a></li>
              <li><a href="#editor-features" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Editor Features</a></li>
              <li><a href="#zen-mode" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Zen Mode</a></li>
              <li><a href="#exporting" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Exporting to PDF & Markdown</a></li>
              <li><a href="#find-replace" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Find & Replace</a></li>
              <li><a href="#templates" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Templates</a></li>
              <li><a href="#timer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Pomodoro Timer</a></li>
              <li><a href="#shortcuts" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Keyboard Shortcuts</a></li>
              <li><a href="#features" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Feature Overview</a></li>
            </ol>
          </section>

          {/* Getting Started */}
          <section id="getting-started">
            <h2>Getting Started</h2>
            <ul>
              <li><strong>New File:</strong> Start with a blank markdown file for total flexibility.</li>
              <li><strong>Templates:</strong> Use pre-built templates for common note types (e.g., book tracker, dashboard, etc.).</li>
              <li><strong>Import:</strong> Bring in existing <code>.md</code> or <code>.txt</code> files to continue editing.</li>
            </ul>
            <p>Choose your path from the welcome screen or the file menu. You can always switch between these options as you work.</p>
          </section>

          {/* Editor Features */}
          <section id="editor-features">
            <h2>Editor Features</h2>
            <ul>
              <li><strong>Live Markdown Editing:</strong> Write and preview markdown in real time.</li>
              <li><strong>Font & Size Customization:</strong> Choose your preferred monospace font and font size for the editor.</li>
              <li><strong>Metadata Editing:</strong> Edit file name, title, description, and tags via the document properties dialog.</li>
              <li><strong>Autosave & Change Tracking:</strong> Your work is automatically saved, and unsaved changes are clearly indicated.</li>
              <li><strong>Sidebar & Mobile Support:</strong> Responsive design for desktop and mobile, with collapsible sidebar.</li>
            </ul>
          </section>

          {/* Zen Mode */}
          <section id="zen-mode">
            <h2>Zen Mode</h2>
            <p>
              Focus on your writing with <strong>Zen Mode</strong>. This mode centers the editor, hides distractions, and provides a clean, immersive writing experience. Toggle Zen Mode using the floating button in the editor or press <b>Esc</b> to exit.
            </p>
          </section>

          {/* Exporting */}
          <section id="exporting">
            <h2>Exporting to PDF & Markdown</h2>
            <ul>
              <li><strong>Export to PDF:</strong> Click the PDF icon or use the shortcut to preview your document as a PDF and export it. The export uses a clean, print-friendly style.</li>
              <li><strong>Save as Markdown:</strong> Use the file menu to save your work as a <code>.md</code> file, preserving all metadata and formatting.</li>
            </ul>
          </section>

          {/* Find & Replace */}
          <section id="find-replace">
            <h2>Find & Replace</h2>
            <p>
              Quickly search your document using the floating FindBar (<b>Cmd/Ctrl+F</b>), or open the Find & Replace modal for advanced options. Navigate between matches and replace text efficiently.
            </p>
          </section>

          {/* Templates */}
          <section id="templates">
            <h2>Templates</h2>
            <p>
              Jumpstart your notes with <strong>Templates</strong>. Select from a variety of pre-built templates for common use cases, or create your own. Templates include structure and sample metadata to help you get started faster.
            </p>
          </section>

          {/* Timer */}
          <section id="timer">
            <h2>Pomodoro Timer</h2>
            <p>
              Boost your productivity with the built-in <strong>Pomodoro Timer</strong>. Configure work and break intervals, track completed pomodoros and cycles, and receive notifications and sounds when sessions end. The timer can be minimized or closed as needed.
            </p>
          </section>

          {/* Keyboard Shortcuts */}
          <section id="shortcuts">
            <h2>Keyboard Shortcuts</h2>
            <ul className="font-mono text-base space-y-2">
              <li><b>⌘/Ctrl + Shift + Y</b>: Save</li>
              <li><b>⌘/Ctrl + Shift + I</b>: Import File</li>
              <li><b>⌘/Ctrl + Shift + U</b>: New File</li>
              <li><b>⌘/Ctrl + Shift + E</b>: Export to PDF</li>
              <li><b>⌘/Ctrl + Shift + M</b>: Select Template</li>
              <li><b>⌘/Ctrl + Shift + H</b>: Go to Home/Dashboard</li>
              <li><b>Esc</b>: Close Dialogs or Exit Zen Mode</li>
              <li><b>Cmd/Ctrl + F</b>: Open FindBar</li>
            </ul>
          </section>

          {/* Feature Overview */}
          <section id="features">
            <h2>Feature Overview</h2>
            <ul>
              <li>Live Markdown Editor with real-time preview</li>
              <li>Zen Mode for focused writing</li>
              <li>Export to PDF and Markdown</li>
              <li>Find & Replace with floating FindBar</li>
              <li>Pre-built and custom templates</li>
              <li>Pomodoro Timer for productivity</li>
              <li>Customizable fonts and sizes</li>
              <li>Metadata editing (title, description, tags)</li>
              <li>Autosave and change tracking</li>
              <li>Responsive design for desktop and mobile</li>
              <li>Comprehensive keyboard shortcuts</li>
            </ul>
          </section>

          {/* Markdown Syntax Guide (condensed) */}
          <section id="markdown-syntax">
            <h2>Markdown Syntax Guide (Quick Reference)</h2>
            <ul>
              <li><b>Headers:</b> <code># H1</code>, <code>## H2</code>, <code>### H3</code></li>
              <li><b>Bold:</b> <code>**bold**</code>, <b>Italic:</b> <code>*italic*</code>, <b>Strikethrough:</b> <code>~~strike~~</code></li>
              <li><b>Lists:</b> <code>- item</code>, <code>1. item</code></li>
              <li><b>Links:</b> <code>[text](url)</code></li>
              <li><b>Images:</b> <code>![alt](url)</code></li>
              <li><b>Code:</b> <code>`inline`</code>, <code>~~~block~~~</code></li>
              <li><b>Tables:</b> <code>| h1 | h2 |</code></li>
            </ul>
            <p>
              For more details, see the full Markdown documentation online: {" "}
              <a
                href="https://www.markdownguide.org/basic-syntax/"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
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
