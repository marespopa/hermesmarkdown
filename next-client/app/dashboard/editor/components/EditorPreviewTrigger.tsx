"use client";
import { useState } from "react";
import DialogModal from "@/app/components/DialogModal";
import Button from "@/app/components/Button";
import { useAtom } from "jotai";
import { atom_contentEdited, atom_frontMatter } from "@/app/atoms/atoms";
import toast from "react-hot-toast";
import { useCommand } from "@/app/hooks/use-command";
import MarkdownPreview from "../../components/MarkdownPreview";
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
                <MarkdownPreview content={contentEdited} />
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

const previewContainerStyles = `mt-8`;
const previewStyles = `prose dark:prose-invert mx-auto prose-pre:bg-transparent prose-pre:px-0 prose-pre:text-gray-600 dark:prose-pre:text-gray-400`;
