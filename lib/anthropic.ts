import Anthropic from "@anthropic-ai/sdk";

let anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  if (anthropicClient) {
    return anthropicClient;
  }

  const heliconeApiKey = process.env.HELICONE_API_KEY?.trim();

  anthropicClient = heliconeApiKey
    ? new Anthropic({
        apiKey,
        baseURL: "https://anthropic.helicone.ai",
        defaultHeaders: {
          "Helicone-Auth": `Bearer ${heliconeApiKey}`,
        },
      })
    : new Anthropic({ apiKey });

  return anthropicClient;
}
