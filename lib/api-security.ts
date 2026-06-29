const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 20;

export const MAX_TEXT_INPUT_CHARS = 50_000;
export const MAX_CHAT_MESSAGES = 50;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");

  return (
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    cfIp?.trim() ||
    "unknown-client"
  );
}

export function enforceRateLimit(
  request: Request,
  routeName: string,
  maxRequests = DEFAULT_RATE_LIMIT_MAX
): Response | null {
  const now = Date.now();
  const key = `${routeName}:${getClientIdentifier(request)}`;
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return null;
  }

  if (current.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);

    return Response.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      }
    );
  }

  current.count += 1;
  return null;
}

export function isTextTooLarge(text: string): boolean {
  return text.length > MAX_TEXT_INPUT_CHARS;
}

export function payloadTooLargeResponse(): Response {
  return Response.json(
    {
      error: `Request text is too large. Maximum length is ${MAX_TEXT_INPUT_CHARS} characters.`,
    },
    { status: 413 }
  );
}

export function internalServerErrorResponse(message: string): Response {
  return Response.json({ error: message }, { status: 500 });
}
