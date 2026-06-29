export interface EvaluateRequest {
  text: string;
  context: string;
  filename?: string;
}

export function isEvaluateRequest(body: unknown): body is EvaluateRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "text" in body &&
    "context" in body &&
    typeof (body as EvaluateRequest).text === "string" &&
    typeof (body as EvaluateRequest).context === "string" &&
    (!("filename" in body) ||
      typeof (body as EvaluateRequest).filename === "string" ||
      (body as EvaluateRequest).filename === undefined)
  );
}

export function isValidEvaluateRequest(body: EvaluateRequest): boolean {
  return body.text.trim().length > 0 && body.context.trim().length > 0;
}

export function buildEvaluationUserMessage(body: EvaluateRequest): string {
  const sourceLabel = body.filename?.trim() || "provided source context";

  return `Source label: ${sourceLabel}\n\nSOURCE CONTEXT:\n${body.context}\n\nAI-GENERATED TEXT TO EVALUATE:\n${body.text}`;
}
