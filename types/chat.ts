export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export function isChatMessage(value: unknown): value is ChatMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "role" in value &&
    "content" in value &&
    ((value as ChatMessage).role === "user" ||
      (value as ChatMessage).role === "assistant") &&
    typeof (value as ChatMessage).content === "string"
  );
}

export function isChatRequest(body: unknown): body is ChatRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "messages" in body &&
    Array.isArray((body as ChatRequest).messages) &&
    (body as ChatRequest).messages.every(isChatMessage)
  );
}

export function isValidChatRequest(body: ChatRequest): boolean {
  if (body.messages.length === 0) {
    return false;
  }

  const lastMessage = body.messages[body.messages.length - 1];
  return lastMessage.role === "user" && lastMessage.content.trim().length > 0;
}
