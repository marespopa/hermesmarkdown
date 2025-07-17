import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { FileMetadata } from "../types/markdown";
import { saveFile } from "./save-utils";
import { ConversionOptions, Margin, Resolution } from "./types";
import Converter from "./converter";

class ExportService {
  static formatTags(metadataTags: string) {
    const tags = metadataTags.split(",");
    let formattedTags = ``;

    tags.forEach((tag) => {
      formattedTags += `  - ${tag.toString().trim()}\n`;
    });

    return formattedTags;
  }

  static formatFrontMatter(metadata: FileMetadata) {
    let text = ``;

    text =
      "---\n" +
      `title: ${metadata.title}\n` +
      `description: ${metadata.description}\n` +
      `tags:\n` +
      `${ExportService.formatTags(metadata.tags)}` +
      `---\n`;

    return text;
  }

  static exportMarkdown(content: string | undefined, frontMatter: FileMetadata) {
    if (!content) {
      return Promise.resolve();
    }

    const fileName = frontMatter?.fileName || "file.md";
    const blob = new Blob([ExportService.formatFrontMatter(frontMatter), content], {
      type: "text/markdown",
    });

    return saveFile({ blob, fileName });
  }

  static async generatePDF (elementId: string, filename: string = "file.pdf"): Promise<InstanceType<typeof jsPDF>> {
    const options: ConversionOptions = {
      resolution: Resolution.MEDIUM as Resolution,
      page: {
         // margin is in MM, default is Margin.NONE = 0
         margin: Margin.SMALL,
         format: 'letter',
         orientation: 'portrait',
      },
      canvas: {
         mimeType: 'image/jpeg',
         qualityRatio: 1,
         logging: true,
         useCORS: true,
      },
      overrides: {
         pdf: {
            compress: true
         },
         canvas: {
            useCORS: true
         }
      },
   };

    const reportElement = document.querySelector(elementId) as HTMLElement;

    if (!reportElement) {
      return Promise.reject("Something went wrong");
    }

    const canvas = await html2canvas(reportElement, {
      scale: Resolution.MEDIUM,
      ...options.overrides?.canvas,
    });
    const converter = new Converter(canvas, options);
    const pdf = converter.convert();

    const pdfFilename = filename;
    await pdf.save(pdfFilename, { returnPromise: true });
    return pdf;
  };
}

export default ExportService;
