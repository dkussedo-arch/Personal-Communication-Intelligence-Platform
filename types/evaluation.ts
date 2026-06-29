export type ClaimStatus =
  | "SUPPORTED"
  | "IMPLIED"
  | "NOT_FOUND"
  | "CONTRADICTED";

export interface EvidenceItem {
  source?: string;
  quote: string;
}

export interface ClaimEvaluation {
  id?: string;
  claim: string;
  status: ClaimStatus;
  explanation?: string;
  evidence?: EvidenceItem[];
}

export interface EvaluationResult {
  claims: ClaimEvaluation[];
}

export const CLAIM_STATUSES: ClaimStatus[] = [
  "SUPPORTED",
  "IMPLIED",
  "NOT_FOUND",
  "CONTRADICTED",
];

export function isClaimStatus(value: unknown): value is ClaimStatus {
  return (
    value === "SUPPORTED" ||
    value === "IMPLIED" ||
    value === "NOT_FOUND" ||
    value === "CONTRADICTED"
  );
}

export function isClaimEvaluation(value: unknown): value is ClaimEvaluation {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as ClaimEvaluation;
  return (
    typeof candidate.claim === "string" && isClaimStatus(candidate.status)
  );
}

export function isEvaluationResult(value: unknown): value is EvaluationResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "claims" in value &&
    Array.isArray((value as EvaluationResult).claims) &&
    (value as EvaluationResult).claims.every(isClaimEvaluation)
  );
}
