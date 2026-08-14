import { describe, expect, it } from 'vitest';

import {
  calculateInsightMetrics,
  formatActivationTrend,
  hasHelpfulReflection,
  localDateKeyForInstant,
} from '../../src/domain/insights';
import type {
  AttemptOutcome,
  Bottleneck,
  DailyState,
  TaskAttempt,
} from '../../src/domain/types';

interface AttemptInput {
  id: string;
  createdAt?: string;
  startedAt?: string | null;
  outcome?: AttemptOutcome | null;
  bottlenecks?: Bottleneck[];
  aversionBefore?: number | null;
  aversionAfter?: number | null;
}

function makeAttempt({
  id,
  createdAt = '2026-08-13T03:00:00.000Z',
  startedAt = null,
  outcome = null,
  bottlenecks = ['taskClarity'],
  aversionBefore = 8,
  aversionAfter = null,
}: AttemptInput): TaskAttempt {
  return {
    id,
    taskText: '机の上を片付けたい',
    category: 'tidying',
    assessment: {
      answers: {
        taskClarity: false,
        aversion: aversionBefore,
        lowActivation: null,
        rewardDistance: null,
        timeAmbiguity: null,
        cueWeakness: null,
        competingReward: null,
      },
      unansweredAxes: [
        'lowActivation',
        'rewardDistance',
        'timeAmbiguity',
        'cueWeakness',
        'competingReward',
      ],
      axisScores: [],
      primaryBottlenecks: [...bottlenecks],
    },
    plan: {
      firstAction: '目の前の物を1つ手に取る',
      durationMinutes: 1,
      startCue: 'この画面を閉じたら',
      activationRitual: null,
      distractionFriction: null,
      microReward: null,
      valueAnchor: null,
      returnCue: null,
      reassuranceAction: null,
      emotionSupport: null,
      supportiveMessage: '最初の一歩だけです。',
      bottlenecks: [...bottlenecks],
      source: 'local',
      createdAt,
    },
    createdAt,
    startedAt,
    endedAt: outcome ? '2026-08-13T03:02:00.000Z' : null,
    outcome,
    reflection: {
      aversionBefore,
      aversionAfter,
      actualDifficulty: null,
      wantsToContinue: outcome === 'continued' ? true : null,
    },
    updatedAt: startedAt ?? createdAt,
    deletedAt: null,
  };
}

function makeState(date: string, activation: number): DailyState {
  return {
    id: `state-${date}`,
    date,
    sleepRestfulness: 5,
    mood: 5,
    activation,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

describe('calculateInsightMetrics', () => {
  it('uses every persisted plan as the start-rate denominator', () => {
    const metrics = calculateInsightMetrics(
      {
        attempts: [
          makeAttempt({
            id: 'recent-start',
            startedAt: '2026-08-13T04:00:00.000Z',
          }),
          makeAttempt({ id: 'planned-only' }),
          makeAttempt({
            id: 'old-start',
            createdAt: '2026-08-01T03:00:00.000Z',
            startedAt: '2026-08-01T04:00:00.000Z',
          }),
        ],
        dailyStates: [],
      },
      { now: new Date('2026-08-14T03:00:00.000Z') },
    );

    expect(metrics).toMatchObject({
      plannedCount: 3,
      startedCount: 2,
      startRate: 67,
      weekStarts: 1,
    });
  });

  it('ranks interventions from helpful reflections rather than raw use frequency', () => {
    const frequentButUnreflected = Array.from({ length: 4 }, (_, index) =>
      makeAttempt({ id: `unreflected-${index}`, bottlenecks: ['taskClarity'] }),
    );
    const metrics = calculateInsightMetrics({
      attempts: [
        ...frequentButUnreflected,
        makeAttempt({
          id: 'activation-1',
          startedAt: '2026-08-13T03:00:00.000Z',
          outcome: 'stopped_success',
          bottlenecks: ['lowActivation'],
        }),
        makeAttempt({
          id: 'activation-2',
          startedAt: '2026-08-13T04:00:00.000Z',
          outcome: 'continued',
          bottlenecks: ['lowActivation'],
        }),
        makeAttempt({
          id: 'stuck-without-relief',
          startedAt: '2026-08-13T05:00:00.000Z',
          outcome: 'stuck',
          bottlenecks: ['taskClarity'],
          aversionAfter: 9,
        }),
        makeAttempt({
          id: 'stuck-but-lower-burden',
          startedAt: '2026-08-13T06:00:00.000Z',
          outcome: 'stuck',
          bottlenecks: ['aversion'],
          aversionAfter: 3,
        }),
      ],
      dailyStates: [],
    });

    expect(metrics.topIntervention).toBe('lowActivation');
    expect(metrics.topInterventionEvidenceCount).toBe(2);
    expect(hasHelpfulReflection(
      makeAttempt({
        id: 'lower',
        startedAt: '2026-08-13T06:00:00.000Z',
        outcome: 'stuck',
        aversionAfter: 3,
      }),
    )).toBe(true);
  });

  it('does not show a state trend before five same-day attempt/state matches', () => {
    const attempts = Array.from({ length: 5 }, (_, index) =>
      makeAttempt({
        id: `attempt-${index}`,
        createdAt: `2026-08-${String(index + 1).padStart(2, '0')}T03:00:00.000Z`,
      }),
    );
    const dailyStates = Array.from({ length: 4 }, (_, index) =>
      makeState(`2026-08-${String(index + 1).padStart(2, '0')}`, index < 2 ? 3 : 7),
    );
    const metrics = calculateInsightMetrics(
      { attempts, dailyStates },
      { timeZone: 'UTC' },
    );

    expect(metrics.joinedStateAttemptCount).toBe(4);
    expect(metrics.activationTrend).toBeNull();
  });

  it('compares low and higher activation start rates after five joined attempts', () => {
    const metrics = calculateInsightMetrics(
      {
        attempts: [
          makeAttempt({
            id: 'low-1',
            createdAt: '2026-08-12T15:30:00.000Z',
            startedAt: '2026-08-12T15:35:00.000Z',
          }),
          makeAttempt({
            id: 'low-2',
            createdAt: '2026-08-12T16:30:00.000Z',
            startedAt: '2026-08-12T16:35:00.000Z',
          }),
          makeAttempt({
            id: 'low-3',
            createdAt: '2026-08-12T17:30:00.000Z',
          }),
          makeAttempt({
            id: 'higher-1',
            createdAt: '2026-08-13T15:30:00.000Z',
            startedAt: '2026-08-13T15:35:00.000Z',
          }),
          makeAttempt({
            id: 'higher-2',
            createdAt: '2026-08-13T16:30:00.000Z',
            startedAt: '2026-08-13T16:35:00.000Z',
          }),
        ],
        dailyStates: [
          makeState('2026-08-13', 3),
          makeState('2026-08-14', 7),
        ],
      },
      { timeZone: 'Asia/Tokyo' },
    );

    expect(localDateKeyForInstant('2026-08-12T15:30:00.000Z', 'Asia/Tokyo')).toBe(
      '2026-08-13',
    );
    expect(metrics.activationTrend).toEqual({
      matchedAttempts: 5,
      lowActivation: { planned: 3, started: 2, rate: 67 },
      higherActivation: { planned: 2, started: 2, rate: 100 },
    });
    const text = formatActivationTrend(metrics.activationTrend!);
    expect(text).toContain('3件中2件（67%）');
    expect(text).toContain('2件中2件（100%）');
    expect(text).toContain('覚醒度が開始を変えたとは判断できません');
  });

  it('waits for observations in both activation groups before comparing them', () => {
    const attempts = Array.from({ length: 5 }, (_, index) =>
      makeAttempt({ id: `low-only-${index}` }),
    );
    const metrics = calculateInsightMetrics(
      { attempts, dailyStates: [makeState('2026-08-13', 2)] },
      { timeZone: 'UTC' },
    );

    expect(metrics.joinedStateAttemptCount).toBe(5);
    expect(metrics.activationTrend).toBeNull();
  });
});
