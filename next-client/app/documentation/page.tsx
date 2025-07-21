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
              <li><a href="#table-editor" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Table Editor</a></li>
              <li><a href="#zen-mode" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Zen Mode</a></li>
              <li><a href="#exporting" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Exporting to PDF & Markdown</a></li>
              <li><a href="#find-replace" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Find & Replace</a></li>
              <li><a href="#templates" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Templates</a></li>
              <li><a href="#timer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Timer</a></li>
              <li><a href="#shortcuts" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Keyboard Shortcuts</a></li>
              <li><a href="#features" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Feature Overview</a></li>
              <li><a href="#privacy-security" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Privacy & Security</a></li>
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

          {/* Table Editor */}
          <section id="table-editor">
            <h2>Table Editor</h2>
            <p>
              Create and edit markdown tables with ease using the <strong>Table Editor</strong>. This powerful tool provides an intuitive interface for building well-formatted tables without having to write markdown syntax manually.
            </p>
            <ul>
              <li><strong>Create New Tables:</strong> Start with a blank table and add rows and columns as needed.</li>
              <li><strong>Edit Existing Tables:</strong> Import existing markdown tables and modify them visually.</li>
              <li><strong>Add/Remove Rows & Columns:</strong> Dynamically adjust table structure with simple controls.</li>
              <li><strong>Inline Cell Editing:</strong> Click any cell to edit its content directly.</li>
              <li><strong>Automatic Markdown Generation:</strong> Tables are automatically formatted with proper markdown syntax.</li>
            </ul>
            <p>
              Access the Table Editor from the sidebar, mobile menu, or use the keyboard shortcut <b>⌘/Ctrl + Shift + T</b>.
            </p>
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
              <li><strong>Export as Markdown:</strong> Use the file menu to export your work as a <code>.md</code> file, preserving all metadata and formatting.</li>
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
            <h2>Timer</h2>
            <p>
              Boost your productivity with the built-in <strong>Timer</strong>. Configure your preferred duration, start, pause, and reset as needed, and receive notifications and sounds when your session ends. The timer can be minimized or closed as needed.
            </p>
            <ul>
              <li><strong>Starting & Pausing:</strong> Use the play/pause button on the timer to start or pause your current session at any time.</li>
              <li><strong>Resetting:</strong> Click the reset button to restart the current interval from the beginning.</li>
              <li><strong>Configuring Duration:</strong> Open the timer settings (gear icon) to set a custom duration for your session.</li>
              <li><strong>Location:</strong> The timer is accessible from the main workspace toolbar. On mobile, it appears at the bottom of the screen for easy access.</li>
              <li><strong>Notifications & Sounds:</strong> When a session ends, you&apos;ll receive a notification and a sound alert (if enabled). Make sure your browser allows notifications and sound for the best experience.</li>
              <li><strong>Minimizing & Tracking:</strong> You can minimize the timer to keep it out of the way while working. The app tracks your current session&apos;s progress.</li>
            </ul>
          </section>

          {/* Keyboard Shortcuts */}
          <section id="shortcuts">
            <h2>Keyboard Shortcuts</h2>
            <ul className="font-mono text-base space-y-2">
              <li><b>⌘/Ctrl + Shift + Y</b>: Export</li>
              <li><b>⌘/Ctrl + Shift + I</b>: Import File</li>
              <li><b>⌘/Ctrl + Shift + U</b>: New File</li>
              <li><b>⌘/Ctrl + Shift + E</b>: Export to PDF</li>
              <li><b>⌘/Ctrl + Shift + M</b>: Select Template</li>
              <li><b>⌘/Ctrl + Shift + T</b>: Table Editor</li>
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
              <li>Table Editor for creating and editing markdown tables</li>
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

          {/* Privacy & Security */}
          <section id="privacy-security">
            <h2>Privacy & Security</h2>
            <p>
              At Hermes Markdown, we believe your privacy is fundamental. This section explains how we handle your data and what you can expect regarding security.
            </p>

            <h3>Data Storage & Privacy</h3>
            <ul>
              <li><strong>Local-Only Storage:</strong> All your content is stored locally in your browser&apos;s local storage. Your documents never leave your device or get uploaded to any servers.</li>
              <li><strong>No Server Storage:</strong> We don&apos;t have any backend servers that store your data. Hermes Markdown is a client-side only application.</li>
              <li><strong>No Data Collection:</strong> We don&apos;t collect any personal information, usage statistics, or content from your documents.</li>
              <li><strong>No Analytics:</strong> We don&apos;t use tracking, analytics, or any data collection methods.</li>
              <li><strong>No Cookies:</strong> We don&apos;t use cookies for tracking or storing personal information.</li>
            </ul>

            <h3>Browser Permissions & Warnings</h3>
            <p>
              You may see browser warnings about site permissions. This is normal and expected for web applications that need to:
            </p>
            <ul>
              <li><strong>Access Local Storage:</strong> To save your work locally in your browser</li>
              <li><strong>Access File System:</strong> To import existing files and export your work</li>
              <li><strong>Send Notifications:</strong> For timer alerts (only if you enable them)</li>
            </ul>
            <p>
              These permissions are only for local functionality - your content never leaves your device.
            </p>

            <h3>Data Management</h3>
            <ul>
              <li><strong>Export Your Data:</strong> You can export your documents as markdown or PDF files to keep permanent copies on your device.</li>
              <li><strong>Clear Browser Data:</strong> You can clear your browser&apos;s local storage anytime, which will delete your saved documents.</li>
              <li><strong>Backup Strategy:</strong> We recommend regularly exporting important documents to ensure you have permanent copies.</li>
            </ul>

            <h3>Offline Functionality</h3>
            <ul>
              <li><strong>Works Offline:</strong> Once loaded, Hermes Markdown works completely offline. You can write, edit, and export documents without an internet connection.</li>
              <li><strong>No Internet Required:</strong> After the initial page load, no internet connection is needed for any functionality.</li>
            </ul>

            <h3>Open Source Transparency</h3>
            <ul>
              <li><strong>Open Source:</strong> Hermes Markdown is open source, meaning you can inspect the code to verify our privacy claims.</li>
              <li><strong>Code Review:</strong> The source code is available on GitHub, so you can see exactly how your data is handled.</li>
              <li><strong>Community Verification:</strong> The open source nature allows the community to review and verify our privacy practices.</li>
            </ul>

            <h3>Security Best Practices</h3>
            <ul>
              <li><strong>HTTPS Only:</strong> The website uses HTTPS encryption to protect data in transit.</li>
              <li><strong>No Sensitive Data Transmission:</strong> Since all data stays local, there&apos;s no risk of data interception during transmission.</li>
              <li><strong>Browser Security:</strong> Your data is protected by your browser&apos;s built-in security features.</li>
            </ul>

            <h3>What We Don&apos;t Do</h3>
            <ul>
              <li>We don&apos;t track your writing or reading habits</li>
              <li>We don&apos;t analyze your content</li>
              <li>We don&apos;t share your data with third parties</li>
              <li>We don&apos;t use your data for advertising</li>
              <li>We don&apos;t store your documents on our servers</li>
              <li>We don&apos;t require any account creation or personal information</li>
            </ul>

            <h3>Your Control</h3>
            <p>
              You have complete control over your data:
            </p>
            <ul>
              <li>Export your documents anytime</li>
              <li>Clear your browser data to remove all saved content</li>
              <li>Use incognito/private browsing for additional privacy</li>
              <li>Inspect the source code to verify our claims</li>
            </ul>

            <p>
              <strong>Your privacy is our priority.</strong> We&apos;ve designed Hermes Markdown to be as private as possible while still providing powerful markdown editing capabilities.
            </p>
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
            <p className="mt-2">
              <b>Tip:</b> When you select a link in the editor, a popup appears allowing you to click and open the link directly.
            </p>
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
