const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TXT_MIME = "text/plain";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_FILE_TYPES = [PDF_MIME, DOCX_MIME, TXT_MIME] as const;

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

export type AcceptedFileType = (typeof ACCEPTED_FILE_TYPES)[number];

export function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex === -1 ? "" : filename.slice(dotIndex).toLowerCase();
}

export function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_FILE_TYPES.includes(file.type as AcceptedFileType)) {
    return true;
  }

  const extension = getFileExtension(file.name);
  return ACCEPTED_EXTENSIONS.includes(
    extension as (typeof ACCEPTED_EXTENSIONS)[number]
  );
}

export function validateFile(file: File): string | null {
  if (!isAcceptedFile(file)) {
    return "Invalid file type. Please upload a PDF, DOCX, or TXT file.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File is too large. Maximum size is 10MB.";
  }

  if (file.size === 0) {
    return "File is empty. Please choose a different file.";
  }

  return null;
}
