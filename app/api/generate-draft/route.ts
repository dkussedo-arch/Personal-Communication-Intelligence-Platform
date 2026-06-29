import {
  enforceRateLimit,
  internalServerErrorResponse,
  isTextTooLarge,
  payloadTooLargeResponse,
} from "@/lib/api-security";
import { getAnthropicClient } from "@/lib/anthropic";
import { loadPrompt, PROMPT_TEMPERATURE } from "@/lib/load-prompt";
import {
  isGenerateDraftRequest,
  isValidGenerateDraftRequest,
} from "@/types/generate-draft";

const MODEL = "claude-sonnet-4-6";

export async function POST(request: Request): Promise<Response> {
  const rateLimitResponse = enforceRateLimit(request, "generate-draft");
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON with a text field." },
      { status: 400 }
    );
  }

  if (!isGenerateDraftRequest(body)) {
    return Response.json(
      { error: "Request body must include a text field of type string." },
      { status: 400 }
    );
  }

  if (!isValidGenerateDraftRequest(body)) {
    return Response.json(
      { error: "Request body is empty or text is missing." },
      { status: 400 }
    );
  }

  if (isTextTooLarge(body.text)) {
    return payloadTooLargeResponse();
  }

  try {
    const anthropic = getAnthropicClient();
    const systemPrompt = await loadPrompt("generate-draft.txt");

    const stream = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: PROMPT_TEMPERATURE.creative,
      stream: true,
      system: systemPrompt,
      messages: [{ role: "user", content: body.text }],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return internalServerErrorResponse(
      "Failed to generate draft. Please try again later."
    );
  }
}
