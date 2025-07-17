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
        <li><b>⌘/Ctrl + Shift + Y</b>: Save</li>
        <li><b>⌘/Ctrl + Shift + I</b>: Import File</li>
        <li><b>⌘/Ctrl + Shift + U</b>: New File</li>
        <li><b>⌘/Ctrl + Shift + E</b>: Export to PDF</li>
        <li><b>⌘/Ctrl + Shift + M</b>: Select Template</li>
        <li><b>⌘/Ctrl + Shift + H</b>: Go to Home/Dashboard</li>
        <li><b>Esc</b>: Close Dialogs</li>
      </ul>
    </div>
  </DialogModal>
);

export default ShortcutsDialog; 