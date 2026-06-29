export interface AnalyzeRequest {
  text: string;
  filename?: string;
}

export function isAnalyzeRequest(body: unknown): body is AnalyzeRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "text" in body &&
    typeof (body as AnalyzeRequest).text === "string" &&
    (!("filename" in body) ||
      typeof (body as AnalyzeRequest).filename === "string" ||
      (body as AnalyzeRequest).filename === undefined)
  );
}

export function isValidAnalyzeRequest(body: AnalyzeRequest): boolean {
  return body.text.trim().length > 0;
}

function buildUserMessage(body: AnalyzeRequest): string {
  if (body.filename?.trim()) {
    return `Analyze the following document ("${body.filename}"):\n\n${body.text}`;
  }

  return `Analyze the following document:\n\n${body.text}`;
}

export { buildUserMessage };
