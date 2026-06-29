import posthog from "posthog-js";

export const PCI_MODEL = "claude-sonnet-4-6";

export type OutputRating = "thumbs_up" | "thumbs_down";
export type ExportFormat = "markdown";

let posthogInitialized = false;

export function initPostHog(): void {
  if (typeof window === "undefined" || posthogInitialized) {
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!apiKey) {
    return;
  }

  posthog.init(apiKey, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
  });

  posthogInitialized = true;
}

function capture(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) {
    return;
  }

  if (!posthogInitialized) {
    initPostHog();
  }

  posthog.capture(event, properties);
}

export function trackPageViewed(pageName: string): void {
  capture("page_viewed", { page_name: pageName });
}

export function trackFileUploaded(fileSizeKb: number, fileType: string): void {
  capture("file_uploaded", {
    file_size_kb: fileSizeKb,
    file_type: fileType,
  });
}

export function trackAiGenerationStarted(
  featureName: string,
  model: string = PCI_MODEL
): void {
  capture("ai_generation_started", {
    feature_name: featureName,
    model,
  });
}

export function trackAiGenerationCompleted(
  latencyMs: number,
  success: boolean,
  featureName?: string
): void {
  capture("ai_generation_completed", {
    latency_ms: latencyMs,
    success,
    ...(featureName ? { feature_name: featureName } : {}),
  });
}

export function trackUserRatedOutput(rating: OutputRating): void {
  capture("user_rated_output", { rating });
}

export function trackExportClicked(exportFormat: ExportFormat): void {
  capture("export_clicked", { export_format: exportFormat });
}
