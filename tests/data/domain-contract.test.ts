import { describe, expect, it } from 'vitest';

import { createLocalRepository } from '../../src/data/repository';
import { attemptFixture } from '../fixtures/domain';

describe('domain persistence contract', () => {
  it('round-trips a complete attempt through the local repository', async () => {
    const repository = createLocalRepository({ forceMemory: true });
    const attempt = attemptFixture();

    await repository.saveAttempt(attempt, {
      entityId: attempt.id,
      updatedAt: attempt.updatedAt,
    });

    await expect(repository.getAttempt(attempt.id)).resolves.toEqual(attempt);
  });

  it('does not invent new optional domain contracts in older stored attempts', async () => {
    const repository = createLocalRepository({ forceMemory: true });
    const attempt = attemptFixture();
    delete attempt.plan.effortCost;
    delete attempt.plan.decisionReduction;
    await repository.saveAttempt(attempt);

    const restored = await repository.getAttempt(attempt.id);
    expect(restored).not.toHaveProperty('stateOverlay');
    expect(restored).not.toHaveProperty('decisionRule');
    expect(restored).not.toHaveProperty('futureCue');
    expect(restored).not.toHaveProperty('supportedUseSummary');
    expect(restored?.plan).not.toHaveProperty('effortCost');
    expect(restored?.plan).not.toHaveProperty('decisionReduction');
  });

  it('round-trips a person-selected decision reduction inside the plan JSON', async () => {
    const repository = createLocalRepository({ forceMemory: true });
    const attempt = attemptFixture();
    attempt.plan.effortCost = { status: 'answered', selected: 'setup_heavy' };
    attempt.plan.decisionReduction = {
      kind: 'setup_heavy',
      label: '準備を1つにする',
      action: '必要そうな物を1つだけ手元に置く',
      explanation: '準備を完了させず、入口だけを置きます。',
    };

    await repository.saveAttempt(attempt);

    const restored = await repository.getAttempt(attempt.id);
    expect(restored?.plan.effortCost).toEqual(attempt.plan.effortCost);
    expect(restored?.plan.decisionReduction).toEqual(attempt.plan.decisionReduction);
  });

  it('round-trips explicit roadmap boundaries without adding them to legacy roadmaps', async () => {
    const repository = createLocalRepository({ forceMemory: true });
    const attempt = attemptFixture({
      roadmap: {
        taskText: '部屋を片付ける',
        category: 'tidying',
        goalState: '床の一角が見える',
        framing: '仮の地図です',
        steps: [{ id: 'now', kind: 'now', title: 'いま', description: '袋を1つ持つ' }],
        consultation: {
          concerns: ['scope'],
          knownContext: null,
          restartCue: '袋を机の横に置く',
        },
        boundaries: {
          todayScope: '床の手前だけ',
          stoppingPoint: '床の一角が見える',
          holdBox: null,
          restartCue: '袋を机の横に置く',
        },
        createdAt: '2026-09-12T00:00:00.000Z',
      },
    });

    await repository.saveAttempt(attempt);
    await expect(repository.getAttempt(attempt.id)).resolves.toEqual(attempt);

    const legacy = structuredClone(attempt);
    delete legacy.roadmap?.boundaries;
    if (legacy.roadmap?.consultation) delete legacy.roadmap.consultation.restartCue;
    legacy.id = '00000000-0000-4000-8000-000000000014';
    await repository.saveAttempt(legacy);
    const restoredLegacy = await repository.getAttempt(legacy.id);
    expect(restoredLegacy?.roadmap).not.toHaveProperty('boundaries');
    expect(restoredLegacy?.roadmap?.consultation).not.toHaveProperty('restartCue');
  });
});
