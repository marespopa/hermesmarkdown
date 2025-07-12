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

export default function EditorPreviewTrigger() {
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [contentEdited] = useAtom(atom_contentEdited);
  const [frontMatter] = useAtom(atom_frontMatter);

  useCommand("export", () => showPdfPreviewModal());

  return (
    <>
      <Button
        variant="secondary"
        label="Export to PDF"
        handler={() => showPdfPreviewModal()}
      />
      <Portal>
        <DialogModal
          isOpened={isPdfPreviewOpen}
          onClose={() => hidePdfPreviewModal()}
        >
          <div className="h-full relative">
            <div className="fixed bottom-2 right-2 sm:flex sm:sticky sm:top-4">
              <Button
                styles="animate-pop flex-initial"
                variant="primary"
                label="Export"
                handler={() => handlePdfExport()}
              />
            </div>
            <div className={previewContainerStyles} id="pdfReport">
              <section className={previewStyles}>
                <PdfMarkdownPreview content={contentEdited} />
              </section>
            </div>
          </div>
        </DialogModal>
      </Portal>
    </>
  );

  async function handlePdfExport() {
    const reportName = frontMatter.fileName.replace(".md", ".pdf");

    try {
      await ExportService.generatePDF("#pdfReport", reportName);
      toast.success("File has been exported");
    } catch (error) {
      toast.error("File could not be exported");
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
    <div data-testid="preview" className="bg-white">
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
const previewStyles = `prose prose-gray mx-auto prose-pre:bg-transparent prose-pre:px-0 prose-pre:text-gray-600 bg-white text-gray-900 prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-gray-700 prose-blockquote:text-gray-700 prose-li:text-gray-700`;
