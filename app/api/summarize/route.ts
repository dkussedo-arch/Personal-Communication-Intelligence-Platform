import {
  enforceRateLimit,
  internalServerErrorResponse,
  isTextTooLarge,
  payloadTooLargeResponse,
} from "@/lib/api-security";
import { getAnthropicClient } from "@/lib/anthropic";
import { SUMMARY_JSON_SCHEMA } from "@/lib/prompt-config";
import {
  loadJsonAnalyticalPrompt,
  PROMPT_TEMPERATURE,
} from "@/lib/load-prompt";
import {
  buildSummarizeUserMessage,
  isSummarizeRequest,
  isSummaryResult,
  isValidSummarizeRequest,
} from "@/types/summary";

const MODEL = "claude-sonnet-4-6";

function getTextContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string"
      ) {
        return block.text;
      }

      return "";
    })
    .join("")
    .trim();
}

function parseSummaryJson(text: string): unknown {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fencedMatch?.[1] ?? trimmed;
  return JSON.parse(jsonText);
}

function isModelErrorResponse(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: string }).error === "string" &&
    !("summary" in value)
  );
}

export async function POST(request: Request): Promise<Response> {
  const rateLimitResponse = enforceRateLimit(request, "summarize");
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

  if (!isSummarizeRequest(body)) {
    return Response.json(
      {
        error:
          "Request body must include a text field of type string and an optional filename field.",
      },
      { status: 400 }
    );
  }

  if (!isValidSummarizeRequest(body)) {
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
    const systemPrompt = await loadJsonAnalyticalPrompt(
      "summary.txt",
      SUMMARY_JSON_SCHEMA
    );

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: PROMPT_TEMPERATURE.analytical,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: buildSummarizeUserMessage(body),
        },
      ],
    });

    const textContent = getTextContent(message.content);
    if (!textContent) {
      return internalServerErrorResponse(
        "Model returned an empty summary result."
      );
    }

    const parsed = parseSummaryJson(textContent);

    if (isModelErrorResponse(parsed)) {
      return Response.json({ error: parsed.error }, { status: 422 });
    }

    if (!isSummaryResult(parsed)) {
      return Response.json(
        { error: "Model returned an invalid summary result shape." },
        { status: 500 }
      );
    }

    return Response.json(parsed);
  } catch {
    return internalServerErrorResponse(
      "Failed to summarize document. Please try again later."
    );
  }
}
