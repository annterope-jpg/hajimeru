import {
  assessBottlenecks,
  createEmptyAttemptReflection,
  createLocalInterventionPlan,
  type Assessment,
  type TaskAttempt,
} from '../../src/domain';

export const FIXTURE_NOW = '2026-09-05T06:00:00.000Z';

export function assessmentFixture(
  overrides: Parameters<typeof assessBottlenecks>[0] = {},
): Assessment {
  return assessBottlenecks({ taskClarity: true, aversion: 0, lowActivation: 0, ...overrides });
}

export function attemptFixture(
  overrides: Partial<TaskAttempt> = {},
): TaskAttempt {
  const assessment = overrides.assessment ?? assessmentFixture();
  return {
    id: '00000000-0000-4000-8000-000000000001',
    taskText: '机の上を整える',
    category: 'tidying',
    assessment,
    plan: createLocalInterventionPlan({
      taskText: '机の上を整える',
      category: 'tidying',
      assessment,
      createdAt: FIXTURE_NOW,
    }),
    roadmap: null,
    createdAt: FIXTURE_NOW,
    startedAt: null,
    endedAt: null,
    outcome: null,
    reflection: createEmptyAttemptReflection(),
    updatedAt: FIXTURE_NOW,
    deletedAt: null,
    ...overrides,
  };
}
