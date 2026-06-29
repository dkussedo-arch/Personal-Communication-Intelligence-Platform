import {
  enforceRateLimit,
  internalServerErrorResponse,
  isTextTooLarge,
  MAX_CHAT_MESSAGES,
  payloadTooLargeResponse,
} from "@/lib/api-security";
import { getAnthropicClient } from "@/lib/anthropic";
import { loadPrompt, PROMPT_TEMPERATURE } from "@/lib/load-prompt";
import {
  isChatRequest,
  isValidChatRequest,
} from "@/types/chat";

const MODEL = "claude-sonnet-4-6";

export async function POST(request: Request): Promise<Response> {
  const rateLimitResponse = enforceRateLimit(request, "chat");
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON with a messages array." },
      { status: 400 }
    );
  }

  if (!isChatRequest(body)) {
    return Response.json(
      {
        error:
          "Request body must include a messages array of { role, content } objects.",
      },
      { status: 400 }
    );
  }

  if (!isValidChatRequest(body)) {
    return Response.json(
      {
        error:
          "Messages must not be empty and the last message must be a non-empty user message.",
      },
      { status: 400 }
    );
  }

  if (
    body.messages.length > MAX_CHAT_MESSAGES ||
    isTextTooLarge(body.messages.map((message) => message.content).join("\n"))
  ) {
    return payloadTooLargeResponse();
  }

  try {
    const anthropic = getAnthropicClient();
    const systemPrompt = await loadPrompt("chat.txt");

    const stream = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: PROMPT_TEMPERATURE.creative,
      stream: true,
      system: systemPrompt,
      messages: body.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
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
      "Failed to generate response. Please try again later."
    );
  }
}
