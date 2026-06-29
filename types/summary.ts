export type SummaryConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface SummaryResult {
  summary: string;
  key_points: string[];
  action_items: string[];
  confidence: SummaryConfidence;
  flags: string[];
}

export interface SummarizeRequest {
  text: string;
  filename?: string;
}

export function isSummarizeRequest(body: unknown): body is SummarizeRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "text" in body &&
    typeof (body as SummarizeRequest).text === "string" &&
    (!("filename" in body) ||
      typeof (body as SummarizeRequest).filename === "string" ||
      (body as SummarizeRequest).filename === undefined)
  );
}

export function isValidSummarizeRequest(body: SummarizeRequest): boolean {
  return body.text.trim().length > 0;
}

export function isSummaryConfidence(value: unknown): value is SummaryConfidence {
  return value === "HIGH" || value === "MEDIUM" || value === "LOW";
}

export function isSummaryResult(value: unknown): value is SummaryResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as SummaryResult;

  return (
    typeof candidate.summary === "string" &&
    Array.isArray(candidate.key_points) &&
    candidate.key_points.every((item) => typeof item === "string") &&
    Array.isArray(candidate.action_items) &&
    candidate.action_items.every((item) => typeof item === "string") &&
    isSummaryConfidence(candidate.confidence) &&
    Array.isArray(candidate.flags) &&
    candidate.flags.every((item) => typeof item === "string")
  );
}

export function buildSummarizeUserMessage(body: SummarizeRequest): string {
  if (body.filename?.trim()) {
    return `Summarize the following document ("${body.filename}"):\n\n${body.text}`;
  }

  return `Summarize the following document:\n\n${body.text}`;
}
