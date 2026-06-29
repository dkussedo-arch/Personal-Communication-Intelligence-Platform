"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EvaluationResults } from "@/components/EvaluationResults";
import {
  PCI_MODEL,
  trackAiGenerationCompleted,
  trackAiGenerationStarted,
} from "@/lib/analytics";
import { isEvaluationResult, type EvaluationResult } from "@/types/evaluation";

const EVALUATE_FEATURE = "claim_evaluation";

export function ClaimEvaluator() {
  const [context, setContext] = useState("");
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    context.trim().length > 0 && text.trim().length > 0 && !isEvaluating;

  const handleEvaluate = async () => {
    if (!canSubmit) {
      return;
    }

    setIsEvaluating(true);
    setError(null);
    setResult(null);

    trackAiGenerationStarted(EVALUATE_FEATURE, PCI_MODEL);
    const startedAt = performance.now();

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          text,
          ...(filename.trim() ? { filename: filename.trim() } : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof (payload as { error: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Claim evaluation failed. Please try again.";
        throw new Error(message);
      }

      if (!isEvaluationResult(payload)) {
        throw new Error("Received an unexpected evaluation response.");
      }

      setResult(payload);
      trackAiGenerationCompleted(
        Math.round(performance.now() - startedAt),
        true,
        EVALUATE_FEATURE
      );
    } catch (evaluateError) {
      trackAiGenerationCompleted(
        Math.round(performance.now() - startedAt),
        false,
        EVALUATE_FEATURE
      );
      setError(
        evaluateError instanceof Error
          ? evaluateError.message
          : "Something went wrong while evaluating claims."
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <label
            htmlFor="evaluate-context"
            className="text-sm font-medium"
          >
            Source context
          </label>
          <textarea
            id="evaluate-context"
            value={context}
            onChange={(event) => setContext(event.target.value)}
            disabled={isEvaluating}
            rows={5}
            placeholder="Paste the source document the claims should be grounded in..."
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="evaluate-text" className="text-sm font-medium">
            AI-generated text to evaluate
          </label>
          <textarea
            id="evaluate-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={isEvaluating}
            rows={5}
            placeholder="Paste the AI-generated summary or draft whose claims you want to verify..."
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="evaluate-filename" className="text-sm font-medium">
            Source label{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <input
            id="evaluate-filename"
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            disabled={isEvaluating}
            placeholder="e.g. Q4-board-update.pdf"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <Button
          type="button"
          onClick={handleEvaluate}
          disabled={!canSubmit}
          className="w-full"
        >
          {isEvaluating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Evaluating claims...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Evaluate Claims
            </>
          )}
        </Button>
      </div>

      {result && (
        <EvaluationResults
          result={result}
          documentName={filename.trim() || undefined}
        />
      )}
    </div>
  );
}
