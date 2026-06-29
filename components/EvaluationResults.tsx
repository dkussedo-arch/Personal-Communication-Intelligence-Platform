"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  HelpCircle,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { trackExportClicked } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  CLAIM_STATUSES,
  type ClaimEvaluation,
  type ClaimStatus,
  type EvaluationResult,
} from "@/types/evaluation";

interface EvaluationResultsProps {
  result: EvaluationResult;
  documentName?: string;
}

type StatusFilter = ClaimStatus | "ALL";

interface StatusConfig {
  label: string;
  badge: string;
  dot: string;
  icon: typeof CheckCircle2;
}

const STATUS_CONFIG: Record<ClaimStatus, StatusConfig> = {
  SUPPORTED: {
    label: "Supported",
    badge:
      "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
    dot: "bg-green-500",
    icon: CheckCircle2,
  },
  IMPLIED: {
    label: "Implied",
    badge:
      "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
    dot: "bg-yellow-500",
    icon: HelpCircle,
  },
  NOT_FOUND: {
    label: "Not Found",
    badge:
      "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
    dot: "bg-orange-500",
    icon: AlertTriangle,
  },
  CONTRADICTED: {
    label: "Contradicted",
    badge:
      "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    dot: "bg-red-500",
    icon: XCircle,
  },
};

const FLAGGED_STATUSES: ClaimStatus[] = ["NOT_FOUND", "CONTRADICTED"];

function getClaimKey(claim: ClaimEvaluation, index: number): string {
  return claim.id ?? `claim-${index}`;
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        config.badge
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

export function EvaluationResults({
  result,
  documentName,
}: EvaluationResultsProps) {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { claims } = result;

  const counts = useMemo(() => {
    const base: Record<ClaimStatus, number> = {
      SUPPORTED: 0,
      IMPLIED: 0,
      NOT_FOUND: 0,
      CONTRADICTED: 0,
    };

    for (const claim of claims) {
      base[claim.status] += 1;
    }

    return base;
  }, [claims]);

  const total = claims.length;
  const supportedCount = counts.SUPPORTED;
  const flaggedCount = counts.NOT_FOUND + counts.CONTRADICTED;

  const supportedPct = total === 0 ? 0 : Math.round((supportedCount / total) * 100);
  const flaggedPct = total === 0 ? 0 : Math.round((flaggedCount / total) * 100);

  const scoreColor =
    supportedPct >= 80
      ? "text-green-600 dark:text-green-400"
      : supportedPct >= 50
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  const filteredClaims = useMemo(() => {
    if (filter === "ALL") {
      return claims;
    }
    return claims.filter((claim) => claim.status === filter);
  }, [claims, filter]);

  const toggleExpanded = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleExport = () => {
    trackExportClicked("markdown");

    const lines: string[] = [];
    lines.push("# Claim Evaluation Report");
    if (documentName) {
      lines.push(`Document: ${documentName}`);
    }
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");
    lines.push("## Summary");
    lines.push(`Total claims: ${total}`);
    lines.push(`Supported: ${supportedCount} (${supportedPct}%)`);
    lines.push(`Flagged: ${flaggedCount} (${flaggedPct}%)`);
    lines.push(`Implied: ${counts.IMPLIED}`);
    lines.push(`Not found: ${counts.NOT_FOUND}`);
    lines.push(`Contradicted: ${counts.CONTRADICTED}`);
    lines.push("");
    lines.push("## Claims");

    claims.forEach((claim, index) => {
      lines.push("");
      lines.push(`### ${index + 1}. [${claim.status}] ${claim.claim}`);
      if (claim.explanation) {
        lines.push(`Explanation: ${claim.explanation}`);
      }
      if (claim.evidence && claim.evidence.length > 0) {
        lines.push("Evidence:");
        claim.evidence.forEach((item) => {
          const source = item.source ? `${item.source}: ` : "";
          lines.push(`  - ${source}"${item.quote}"`);
        });
      }
    });

    const report = lines.join("\n");
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `evaluation-report-${Date.now()}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const filterOptions: { value: StatusFilter; label: string; count: number }[] =
    [
      { value: "ALL", label: "All", count: total },
      ...CLAIM_STATUSES.map((status) => ({
        value: status,
        label: STATUS_CONFIG[status].label,
        count: counts[status],
      })),
    ];

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={cn("text-5xl font-bold tabular-nums", scoreColor)}>
                {supportedPct}%
              </div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Supported
              </div>
            </div>
            <div className="h-14 w-px bg-border" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <div className="text-2xl font-semibold tabular-nums">
                  {total}
                </div>
                <div className="text-xs text-muted-foreground">Total claims</div>
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                  {flaggedPct}%
                </div>
                <div className="text-xs text-muted-foreground">Flagged</div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            disabled={total === 0}
            className="shrink-0"
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => {
          const isActive = filter === option.value;
          const dotClass =
            option.value === "ALL"
              ? "bg-foreground"
              : STATUS_CONFIG[option.value].dot;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", dotClass)} />
              {option.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  isActive ? "bg-primary-foreground/20" : "bg-muted"
                )}
              >
                {option.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {filteredClaims.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No claims match this filter.
          </div>
        )}

        {filteredClaims.map((claim, index) => {
          const key = getClaimKey(claim, index);
          const isOpen = expanded.has(key);
          const hasDetail = Boolean(
            claim.explanation || (claim.evidence && claim.evidence.length > 0)
          );

          return (
            <div
              key={key}
              className="overflow-hidden rounded-lg border bg-card shadow-sm"
            >
              <button
                type="button"
                onClick={() => hasDetail && toggleExpanded(key)}
                className={cn(
                  "flex w-full items-start gap-3 p-4 text-left",
                  hasDetail && "hover:bg-accent/50"
                )}
                aria-expanded={isOpen}
                disabled={!hasDetail}
              >
                <div className="shrink-0">
                  <StatusBadge status={claim.status} />
                </div>
                <p className="flex-1 text-sm font-medium leading-relaxed">
                  {claim.claim}
                </p>
                {hasDetail && (
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                )}
              </button>

              {isOpen && hasDetail && (
                <div className="space-y-3 border-t bg-muted/30 px-4 py-3 pl-4 text-sm">
                  {claim.explanation && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Explanation
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {claim.explanation}
                      </p>
                    </div>
                  )}

                  {claim.evidence && claim.evidence.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Evidence
                      </div>
                      <ul className="mt-1 space-y-2">
                        {claim.evidence.map((item, evidenceIndex) => (
                          <li
                            key={evidenceIndex}
                            className="border-l-2 border-border pl-3"
                          >
                            {item.source && (
                              <div className="text-xs font-medium text-foreground">
                                {item.source}
                              </div>
                            )}
                            <p className="text-muted-foreground">
                              &ldquo;{item.quote}&rdquo;
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
