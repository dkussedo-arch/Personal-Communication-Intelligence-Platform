export interface GenerateDraftRequest {
  text: string;
}

export function isGenerateDraftRequest(
  body: unknown
): body is GenerateDraftRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "text" in body &&
    typeof (body as GenerateDraftRequest).text === "string"
  );
}

export function isValidGenerateDraftRequest(
  body: GenerateDraftRequest
): boolean {
  return body.text.trim().length > 0;
}
