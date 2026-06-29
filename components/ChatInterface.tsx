"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OutputRating } from "@/components/OutputRating";
import {
  PCI_MODEL,
  trackAiGenerationCompleted,
  trackAiGenerationStarted,
} from "@/lib/analytics";
import type { ChatMessage, ChatRole } from "@/types/chat";
import { cn } from "@/lib/utils";

interface DisplayMessage extends ChatMessage {
  id: string;
}

interface ChatError {
  message: string;
  history: DisplayMessage[];
}

function createMessage(role: ChatRole, content: string): DisplayMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  };
}

function toApiMessages(messages: DisplayMessage[]): ChatMessage[] {
  return messages.map(({ role, content }) => ({ role, content }));
}

const CHAT_FEATURE = "chat";

export function ChatInterface() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, error, scrollToBottom]);

  const streamResponse = async (
    history: DisplayMessage[],
    assistantId: string
  ) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: toApiMessages(history) }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error ?? "Failed to get a response.");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response stream received.");
    }

    const decoder = new TextDecoder();
    let content = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      content += decoder.decode(value, { stream: true });
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId ? { ...message, content } : message
        )
      );
    }
  };

  const sendConversation = async (history: DisplayMessage[]) => {
    setIsStreaming(true);
    setError(null);

    const assistantMessage = createMessage("assistant", "");
    const historyWithPlaceholder = [...history, assistantMessage];
    setMessages(historyWithPlaceholder);

    trackAiGenerationStarted(CHAT_FEATURE, PCI_MODEL);
    const generationStartedAt = performance.now();

    try {
      await streamResponse(history, assistantMessage.id);
      trackAiGenerationCompleted(
        Math.round(performance.now() - generationStartedAt),
        true,
        CHAT_FEATURE
      );
    } catch (sendError) {
      trackAiGenerationCompleted(
        Math.round(performance.now() - generationStartedAt),
        false,
        CHAT_FEATURE
      );
      setMessages(history);
      setError({
        message:
          sendError instanceof Error
            ? sendError.message
            : "Something went wrong. Please try again.",
        history,
      });
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) {
      return;
    }

    const userMessage = createMessage("user", trimmed);
    const nextHistory = [...messages, userMessage];

    setMessages(nextHistory);
    setInput("");
    void sendConversation(nextHistory);
  };

  const handleRetry = () => {
    if (!error || isStreaming) {
      return;
    }

    void sendConversation(error.history);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const showTypingIndicator =
    isStreaming &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    messages[messages.length - 1].content.length === 0;

  const lastAssistantMessageId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.content.length > 0)
    ?.id;

  return (
    <div className="flex h-[min(720px,calc(100vh-12rem))] w-full max-w-2xl flex-col rounded-lg border bg-card shadow-sm">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            <p>
              Ask for help refining a draft, adapting tone for an audience, or
              strengthening your message.
            </p>
          </div>
        )}

        {messages.map((message) => {
          if (
            message.role === "assistant" &&
            message.content.length === 0 &&
            isStreaming
          ) {
            return null;
          }

          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}
            >
              <div
                className={cn("flex", isUser ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
              {!isUser &&
                !isStreaming &&
                message.id === lastAssistantMessageId && (
                  <OutputRating
                    className="max-w-[85%] w-full"
                    label="Was this response helpful?"
                  />
                )}
            </div>
          );
        })}

        {showTypingIndicator && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span>{error.message}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isStreaming}
              className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            disabled={isStreaming}
            rows={1}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label="Send message"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
