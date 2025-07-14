import React from "react";

const HelpTooltip: React.FC = () => (
  <div
    className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-[-2.5rem] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white text-xs px-3 py-1 rounded shadow z-0 pointer-events-none select-none animate-fade-in"
    aria-hidden="true"
    tabIndex={-1}
  >
    <span>
      Tip: Start typing to begin. Keyboard shortcuts: <kbd>Enter</kbd> (new block), <kbd>Backspace</kbd> (delete), <kbd>↑</kbd>/<kbd>↓</kbd> (navigate).
    </span>
  </div>
);

export default HelpTooltip; 