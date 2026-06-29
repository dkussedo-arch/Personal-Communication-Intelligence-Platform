import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import {
  getFileExtension,
  validateFile,
} from "@/lib/extract-text";

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TXT_MIME = "text/plain";

export async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const extension = getFileExtension(filename);
  const isPdf = mimeType === PDF_MIME || extension === ".pdf";
  const isDocx = mimeType === DOCX_MIME || extension === ".docx";
  const isTxt = mimeType === TXT_MIME || extension === ".txt";

  let text: string;

  if (isPdf) {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    text = result.text;
  } else if (isDocx) {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (isTxt) {
    text = buffer.toString("utf-8");
  } else {
    throw new Error("Unsupported file type.");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("No text could be extracted from this file.");
  }

  return trimmed;
}

export function validateUploadedFile(file: File): string | null {
  return validateFile(file);
}
