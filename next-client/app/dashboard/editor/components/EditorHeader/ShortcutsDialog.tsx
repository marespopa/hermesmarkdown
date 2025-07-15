import DialogModal from "@/app/components/DialogModal";
import React from "react";

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ isOpen, onClose }) => (
  <DialogModal isOpened={isOpen} onClose={onClose}>
    <div className="p-4 max-w-lg">
      <h2 className="text-xl font-bold mb-4">Keyboard Shortcuts</h2>
      <ul className="font-mono text-base space-y-2">
        <li><b>⌘/Ctrl + S</b>: Save</li>
        <li><b>⌘/Ctrl + O</b>: Open File</li>
        <li><b>⌘/Ctrl + N</b>: New File</li>
        <li><b>⌘/Ctrl + F</b>: Find/Replace</li>
        <li><b>⌘/Ctrl + Z</b>: Undo</li>
        <li><b>⌘/Ctrl + Shift + Z</b>: Redo</li>
        <li><b>⌘/Ctrl + P</b>: Command Palette</li>
        <li><b>⌘/Ctrl + B</b>: Toggle Sidebar</li>
        <li><b>Esc</b>: Close Dialogs</li>
      </ul>
    </div>
  </DialogModal>
);

export default ShortcutsDialog; 