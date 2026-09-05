export const SAFE_DIAGNOSTIC_EVENTS = [
  "storage_initialized",
  "storage_failed",
  "ai_fallback_used",
  "sync_completed",
  "sync_failed",
] as const;

export type SafeDiagnosticEventName = (typeof SAFE_DIAGNOSTIC_EVENTS)[number];

export const SAFE_DIAGNOSTIC_CODES = [
  "timeout",
  "network",
  "invalid_response",
  "permission_denied",
  "unavailable",
] as const;
export type SafeDiagnosticCode = (typeof SAFE_DIAGNOSTIC_CODES)[number];

export interface SafeDiagnosticEvent {
  name: SafeDiagnosticEventName;
  feature: "storage" | "ai" | "sync";
  outcome: "ok" | "fallback" | "error";
  code: SafeDiagnosticCode | null;
}

/**
 * Builds diagnostic metadata from an allow-list. Arbitrary input, task text,
 * ratings, identifiers, and clinical content have no place in this contract.
 */
export function createSafeDiagnosticEvent(input: {
  name: SafeDiagnosticEventName;
  feature: SafeDiagnosticEvent["feature"];
  outcome: SafeDiagnosticEvent["outcome"];
  code?: string | null;
}): SafeDiagnosticEvent {
  return {
    name: input.name,
    feature: input.feature,
    outcome: input.outcome,
    code: SAFE_DIAGNOSTIC_CODES.includes(input.code as SafeDiagnosticCode)
      ? (input.code as SafeDiagnosticCode)
      : null,
  };
}

/** Exact claims and evaluative labels that must not appear in user-facing copy. */
export const PROHIBITED_USER_CLAIMS = [
  "ADHDを診断します",
  "ADHDを治療します",
  "症状を改善します",
  "薬を中止してください",
  "服薬量を変更してください",
  "必ずできるようになります",
  "連続未達",
  "達成率ランキング",
] as const;

export function findProhibitedUserClaims(text: string): string[] {
  return PROHIBITED_USER_CLAIMS.filter((claim) => text.includes(claim));
}
