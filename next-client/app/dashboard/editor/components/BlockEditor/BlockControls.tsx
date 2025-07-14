import React from "react";

interface BlockControlsProps {
  isFocused: boolean;
  isHovered: boolean;
  onAddBlock: () => void;
  onMenu?: () => void;
  blockId: string;
}

const BlockControls: React.FC<BlockControlsProps> = () => null;

export default BlockControls; 