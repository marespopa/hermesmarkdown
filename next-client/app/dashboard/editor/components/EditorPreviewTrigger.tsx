"use client";
import { useState } from "react";
import DialogModal from "@/app/components/DialogModal";
import Button from "@/app/components/Button";
import { useAtom } from "jotai";
import { atom_contentEdited, atom_frontMatter } from "@/app/atoms/atoms";
import toast from "react-hot-toast";
import { useCommand } from "@/app/hooks/use-command";
import MarkdownPreview from "../../components/MarkdownPreview";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Portal from "@/app/components/Portal";
import ExportService from "@/app/services/export-service";
import { FaFilePdf } from "react-icons/fa";
import IconButton from "@/app/components/IconButton";

export default function EditorPreviewTrigger() {
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [contentEdited] = useAtom(atom_contentEdited);
  const [frontMatter] = useAtom(atom_frontMatter);
  const [selectedFont, setSelectedFont] = useState<string>("font-sans");
  const [hideFontDropdown, setHideFontDropdown] = useState(false);

  useCommand("export", () => showPdfPreviewModal());

  return (
    <>
      <IconButton
        icon={<FaFilePdf className="w-5 h-5" />}
        title="Export to PDF"
        onClick={showPdfPreviewModal}
        dataTestId="export-pdf"
      />
      <Portal>
        <DialogModal
          isOpened={isPdfPreviewOpen}
          onClose={() => hidePdfPreviewModal()}
        >
          <div className="h-full relative">
            {/* Top bar: Export button (left), Font selector (center), Close (right) */}
            <div className="flex items-center justify-between mb-6">
              <Button
                styles="animate-pop flex-initial"
                variant="primary"
                label="Export"
                handler={() => handlePdfExport()}
              />
              <div className="flex-1 flex justify-center">
                {!hideFontDropdown && (
                  <select
                    id="pdf-font-select"
                    value={selectedFont}
                    onChange={e => setSelectedFont(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow"
                    style={{ minWidth: 120 }}
                  >
                    <option value="font-sans">Sans-serif</option>
                    <option value="font-serif">Serif</option>
                    <option value="font-mono">Monospace</option>
                  </select>
                )}
              </div>
              {/* The close button is handled by DialogModal itself */}
            </div>
            <div className={previewContainerStyles} id="pdfReport">
              <section className={previewStyles}>
                <PdfMarkdownPreview content={contentEdited} fontClass={selectedFont} />
              </section>
            </div>
          </div>
        </DialogModal>
      </Portal>
    </>
  );

  async function handlePdfExport() {
    const reportName = frontMatter.fileName.replace(".md", ".pdf");
    setHideFontDropdown(true);
    await new Promise((resolve) => setTimeout(resolve, 100)); // allow DOM to update
    try {
      await ExportService.generatePDF("#pdfReport", reportName);
      toast.success("File has been exported");
      setHideFontDropdown(false);
    } catch (error) {
      toast.error("File could not be exported");
      console.error(error);
      setHideFontDropdown(false);
    }
  }

  function showPdfPreviewModal() {
    setIsPdfPreviewOpen(true);
  }

  function hidePdfPreviewModal() {
    setIsPdfPreviewOpen(false);
  }
}

// PDF-specific markdown preview that forces light mode
const PdfMarkdownPreview = ({ content, fontClass = "font-sans" }: { content: string, fontClass?: string }) => {
  if (content?.length === 0) {
    return (
      <div data-testid="preview">
        <p className="text-gray-700">The file is currently empty...</p>
      </div>
    );
  }

  return (
    <div data-testid="preview" className={`prose prose-lg mx-auto bg-white text-black prose-headings:text-black prose-p:text-black prose-strong:text-black prose-code:text-black prose-blockquote:text-black prose-li:text-black ${fontClass}`}>
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
};

const previewContainerStyles = `mt-8 bg-white`;
const previewStyles = `prose prose-lg mx-auto bg-white text-black prose-headings:text-black prose-p:text-black prose-strong:text-black prose-code:text-black prose-blockquote:text-black prose-li:text-black`;
