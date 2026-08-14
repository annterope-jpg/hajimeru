import { BOTTLENECK_TIE_PRIORITY } from './assessment';
import type { Bottleneck, DailyState, TaskAttempt } from './types';

const DAY_MS = 24 * 60 * 60 * 1_000;
export const LOW_ACTIVATION_MAX = 4;
export const MIN_STATE_TREND_MATCHES = 5;

export interface InsightsSummaryInput {
  attempts: readonly TaskAttempt[];
  dailyStates: readonly DailyState[];
}

export interface StartRateGroup {
  planned: number;
  started: number;
  rate: number;
}

export interface ActivationStartTrend {
  matchedAttempts: number;
  lowActivation: StartRateGroup;
  higherActivation: StartRateGroup;
}

export interface InsightMetrics {
  plannedCount: number;
  startedCount: number;
  startRate: number;
  weekStarts: number;
  topIntervention: Bottleneck | null;
  topInterventionEvidenceCount: number;
  joinedStateAttemptCount: number;
  activationTrend: ActivationStartTrend | null;
}

export interface InsightMetricOptions {
  now?: Date;
  timeZone?: string;
}

function percentage(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function startRateGroup(attempts: readonly TaskAttempt[]): StartRateGroup {
  const planned = attempts.length;
  const started = attempts.filter(
    (attempt) => typeof attempt.startedAt === 'string' && attempt.startedAt.length > 0,
  ).length;
  return { planned, started, rate: percentage(started, planned) };
}

function resolvedTimeZone(requested?: string): string {
  if (requested) return requested;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo';
}

/** Converts an ISO instant to the same local YYYY-MM-DD key used by DailyState. */
export function localDateKeyForInstant(iso: string, timeZone?: string): string | null {
  const instant = new Date(iso);
  if (!Number.isFinite(instant.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTimeZone(timeZone),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant);
    const fields = new Map(parts.map((part) => [part.type, part.value]));
    const year = fields.get('year');
    const month = fields.get('month');
    const day = fields.get('day');
    return year && month && day ? `${year}-${month}-${day}` : null;
  } catch {
    return null;
  }
}

/**
 * A plan is counted as potentially helpful only after the user reflected on it.
 * Positive evidence is a non-stuck outcome, or a lower post-start aversion even
 * when the user selected "困った". Unreflected frequency is intentionally ignored.
 */
export function hasHelpfulReflection(attempt: TaskAttempt): boolean {
  if (!attempt.startedAt || !attempt.outcome) return false;
  if (attempt.outcome === 'stopped_success' || attempt.outcome === 'continued') {
    return true;
  }
  const { aversionBefore, aversionAfter } = attempt.reflection;
  return (
    typeof aversionBefore === 'number' &&
    typeof aversionAfter === 'number' &&
    aversionAfter < aversionBefore
  );
}

function chooseTopIntervention(attempts: readonly TaskAttempt[]): {
  intervention: Bottleneck | null;
  evidenceCount: number;
} {
  const counts = new Map<Bottleneck, number>();
  for (const attempt of attempts) {
    if (!hasHelpfulReflection(attempt)) continue;
    for (const intervention of new Set(attempt.plan.bottlenecks)) {
      counts.set(intervention, (counts.get(intervention) ?? 0) + 1);
    }
  }

  const ranked = [...counts.entries()].sort((left, right) => {
    const countDifference = right[1] - left[1];
    if (countDifference !== 0) return countDifference;
    return (
      BOTTLENECK_TIE_PRIORITY.indexOf(left[0]) -
      BOTTLENECK_TIE_PRIORITY.indexOf(right[0])
    );
  });
  const first = ranked[0];
  return first
    ? { intervention: first[0], evidenceCount: first[1] }
    : { intervention: null, evidenceCount: 0 };
}

function stateByDate(states: readonly DailyState[]): Map<string, DailyState> {
  const result = new Map<string, DailyState>();
  for (const state of states) {
    const existing = result.get(state.date);
    if (!existing || state.updatedAt > existing.updatedAt) result.set(state.date, state);
  }
  return result;
}

function calculateActivationTrend(
  summary: InsightsSummaryInput,
  timeZone?: string,
): { joined: number; trend: ActivationStartTrend | null } {
  const states = stateByDate(summary.dailyStates);
  const low: TaskAttempt[] = [];
  const higher: TaskAttempt[] = [];

  for (const attempt of summary.attempts) {
    // createdAt assigns both started and unstarted plans to the state recorded
    // on the day the plan was made, preserving a meaningful start-rate denominator.
    const date = localDateKeyForInstant(attempt.createdAt, timeZone);
    const state = date ? states.get(date) : undefined;
    if (!state || !Number.isFinite(state.activation)) continue;
    if (state.activation <= LOW_ACTIVATION_MAX) low.push(attempt);
    else higher.push(attempt);
  }

  const joined = low.length + higher.length;
  if (
    joined < MIN_STATE_TREND_MATCHES ||
    low.length === 0 ||
    higher.length === 0
  ) {
    return { joined, trend: null };
  }
  return {
    joined,
    trend: {
      matchedAttempts: joined,
      lowActivation: startRateGroup(low),
      higherActivation: startRateGroup(higher),
    },
  };
}

export function calculateInsightMetrics(
  summary: InsightsSummaryInput,
  options: InsightMetricOptions = {},
): InsightMetrics {
  const now = options.now ?? new Date();
  const nowTime = now.getTime();
  const weekAgo = nowTime - 7 * DAY_MS;
  const started = summary.attempts.filter(
    (attempt) => typeof attempt.startedAt === 'string' && attempt.startedAt.length > 0,
  );
  const top = chooseTopIntervention(summary.attempts);
  const activation = calculateActivationTrend(summary, options.timeZone);

  return {
    plannedCount: summary.attempts.length,
    startedCount: started.length,
    startRate: percentage(started.length, summary.attempts.length),
    weekStarts: started.filter((attempt) => {
      const time = attempt.startedAt ? new Date(attempt.startedAt).getTime() : Number.NaN;
      return Number.isFinite(time) && time >= weekAgo && time <= nowTime;
    }).length,
    topIntervention: top.intervention,
    topInterventionEvidenceCount: top.evidenceCount,
    joinedStateAttemptCount: activation.joined,
    activationTrend: activation.trend,
  };
}

export function formatActivationTrend(trend: ActivationStartTrend): string {
  const low = trend.lowActivation;
  const higher = trend.higherActivation;
  return (
    `計画を作った日の「動けそうな感覚」が低め（0〜${LOW_ACTIVATION_MAX}）だった記録では` +
    `${low.planned}件中${low.started}件（${low.rate}%）、` +
    `${LOW_ACTIVATION_MAX + 1}〜10だった記録では${higher.planned}件中${higher.started}件` +
    `（${higher.rate}%）で開始していました。これは同日の記録上の並び方であり、` +
    '覚醒度が開始を変えたとは判断できません。'
  );
}
