import DropdownMenu from "@/app/components/DropdownMenu";
import React, { useState } from "react";
import { useAtom } from "jotai";
import { atom_fontSize } from "@/app/atoms/atoms";

interface FontSizeMenuProps {
  fontSizeOptions: { value: string; label: string }[];
  setFontSize: (value: string) => void;
  value?: string;
}

const FontSizeMenu: React.FC<FontSizeMenuProps> = ({ fontSizeOptions, setFontSize, value }) => {
  const fontSizeMenuOptions = fontSizeOptions.map(option => ({
    label: option.label,
    action: () => setFontSize(option.value)
  }));
  const [isOpen, setIsOpen] = useState(false);
  const [atomFontSize] = useAtom(atom_fontSize);
  const fontSize = value !== undefined ? value : atomFontSize;
  const selectedIndex = fontSizeOptions.findIndex(option => option.value === fontSize);

  return (
    <DropdownMenu
      options={fontSizeMenuOptions}
      label={<span className="flex items-center gap-2">Size</span>}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      selectedIndex={selectedIndex === -1 ? null : selectedIndex}
      onSelect={idx => setFontSize(fontSizeOptions[idx].value)}
    />
  );
};

export default FontSizeMenu; 