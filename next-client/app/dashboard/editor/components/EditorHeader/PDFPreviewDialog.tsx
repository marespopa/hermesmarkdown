import DialogModal from "@/app/components/DialogModal";
import DropdownMenu from "@/app/components/DropdownMenu";
import Button from "@/app/components/Button";
import React, { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";

interface PDFPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contentEdited: string;
  handlePdfExport: () => void;
}

const PDFPreviewDialog: React.FC<PDFPreviewDialogProps> = ({
  isOpen,
  onClose,
  contentEdited,
  handlePdfExport,
}) => {
  const fontOptions = [
    { label: 'Sans-serif', value: 'font-sans' },
    { label: 'Serif', value: 'font-serif' },
    { label: 'Monospace', value: 'font-mono' },
  ];
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState('font-sans');
  const [hideFontDropdown, setHideFontDropdown] = useState(false);
  const selectedIndex = fontOptions.findIndex(opt => opt.value === selectedFont);
  const handleSelect = (idx: number) => setSelectedFont(fontOptions[idx].value);
  return (
    <DialogModal isOpened={isOpen} onClose={onClose}>
      <div className="h-full relative">
        {/* Top bar: Export button (left), Font selector (center), Close (right) */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="primary"
            label="Export"
            onClick={handlePdfExport}
          />
          <div className="flex-1 flex justify-center">
            {!hideFontDropdown && (
              <DropdownMenu
                options={fontOptions.map(opt => ({ label: opt.label, action: () => setSelectedFont(opt.value) }))}
                label={fontOptions[selectedIndex]?.label || 'Sans-serif'}
                isOpen={fontMenuOpen}
                onOpenChange={setFontMenuOpen}
                selectedIndex={selectedIndex === -1 ? null : selectedIndex}
                onSelect={handleSelect}
              />
            )}
          </div>
          {/* The close button is handled by DialogModal itself */}
        </div>
        <div className="mb-4 text-xs text-gray-600 dark:text-gray-400 font-mono">
          <strong>PDF Export Disclaimer:</strong> For best readability, exported PDFs always use a white background, even in dark mode.
        </div>
        <div id="pdfReport">
          <section>
            <PdfMarkdownPreview content={contentEdited} fontClass={selectedFont} />
          </section>
        </div>
      </div>
    </DialogModal>
  );
};

function PdfMarkdownPreview({ content, fontClass = "font-sans" }: { content: string, fontClass?: string }) {
  if (!content?.length) {
    return (
      <div data-testid="preview">
        <p className="text-gray-700">The file is currently empty...</p>
      </div>
    );
  }
  return (
    <div data-testid="preview" className={`bg-white prose mx-auto max-w-3xl px-6 py-8 ${fontClass}`} style={{ color: '#222' }}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <SyntaxHighlighter style={docco} PreTag="div" language={match[1]}>
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code {...rest} className={className}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

export default PDFPreviewDialog; 