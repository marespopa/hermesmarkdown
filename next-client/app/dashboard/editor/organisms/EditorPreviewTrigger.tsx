"use client";
import { useState } from "react";
import DialogModal from "@/app/components/DialogModal";
import Button from "@/app/components/Button";
import { useAtom } from "jotai";
import { atom_currentFile } from "@/app/atoms/atoms";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import { useCommand } from "@/app/hooks/use-command";
import MarkdownPreview from "@/app/dashboard/organisms/MarkdownPreview";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Portal from "@/app/components/Portal";
import ExportService from "@/app/services/export-service";
import { FaFilePdf } from "react-icons/fa";
import React, { Children } from "react";

export default function EditorPreviewTrigger() {
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [currentFile] = useAtom(atom_currentFile);

  useCommand("export", () => showPdfPreviewModal());

  if (!currentFile) {
    return null;
  }

  return (
    <>
      <Button
        variant="icon"
        onClick={showPdfPreviewModal}
        aria-label="Export to PDF"
        title="Export to PDF"
        data-testid="export-pdf"
      >
        <FaFilePdf className="w-5 h-5" />
      </Button>
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
                onClick={() => handlePdfExport()}
              />
              <div className="flex-1 flex justify-center">
                {/* The font selector is removed */}
              </div>
              {/* The close button is handled by DialogModal itself */}
            </div>
            <div className={previewContainerStyles} id="pdfReport">
              <section className={previewStyles}>
                <PdfMarkdownPreview content={currentFile.contentEdited} />
              </section>
            </div>
          </div>
        </DialogModal>
      </Portal>
    </>
  );

  async function handlePdfExport() {
    if (!currentFile?.frontMatter) {
      showErrorToast("File could not be exported");
      console.error("There is no file to export.");

      return;
    }

    const reportName = currentFile.frontMatter.fileName.replace(".md", ".pdf");
    await new Promise((resolve) => setTimeout(resolve, 100)); // allow DOM to update
    try {
      await ExportService.generatePDF("#pdfReport", reportName);
      showSuccessToast("File has been exported");
    } catch (error) {
      showErrorToast("File could not be exported");
      console.error(error);
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
const PdfMarkdownPreview = ({ content }: { content: string }) => {
  if (content?.length === 0) {
    return (
      <div data-testid="preview">
        <p className="text-gray-700">The file is currently empty...</p>
      </div>
    );
  }

  return (
    <div data-testid="preview" className={`prose prose-lg mx-auto bg-white text-black prose-headings:text-black prose-p:text-black prose-strong:text-black prose-code:text-black prose-blockquote:text-black prose-li:text-black`}>
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
          ul(props) {
            // Check if any list item contains the • character
            const { children, ...rest } = props;
            const hasBullet = Children.toArray(children).some(child => {
              if (React.isValidElement(child) && child.type === 'li') {
                const childProps = child.props as { children?: React.ReactNode };
                const text = String(childProps.children || '');
                return text.includes('•');
              }
              return false;
            });
            
            const className = hasBullet ? 'bullet-list' : '';
            return (
              <ul {...rest} className={className}>
                {children}
              </ul>
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
