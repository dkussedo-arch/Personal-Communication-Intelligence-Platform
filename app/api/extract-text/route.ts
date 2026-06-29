import {
  enforceRateLimit,
  internalServerErrorResponse,
} from "@/lib/api-security";
import {
  extractTextFromBuffer,
  validateUploadedFile,
} from "@/lib/extract-text-server";

export async function POST(request: Request): Promise<Response> {
  const rateLimitResponse = enforceRateLimit(request, "extract-text", 10);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Request must include a file." },
        { status: 400 }
      );
    }

    const validationError = validateUploadedFile(file);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromBuffer(
      buffer,
      file.name,
      file.type
    );

    return Response.json({ text, filename: file.name });
  } catch {
    return internalServerErrorResponse(
      "Failed to extract text from file. Please try again with a valid PDF, DOCX, or TXT file."
    );
  }
}
